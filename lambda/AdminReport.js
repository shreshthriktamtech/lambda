require('dotenv').config();
const nodemailer = require('nodemailer');
const aws = require("@aws-sdk/client-ses");
const dbconnect = require('../connection/connection');
const { ObjectId } = require('mongodb');

const ses = new aws.SES({
    region: process.env.AWS_SES_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const transporter = nodemailer.createTransport({
    SES: { ses, aws },
});

function getFormattedDateTime4(dateString) {
    const date = new Date(dateString);
    const dateOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    };
    const formattedDate = date.toLocaleDateString("en-US", dateOptions);
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    const formattedTime = date.toLocaleTimeString("en-US", timeOptions);
    return `${formattedDate}, ${formattedTime}`;
}

const sendEmailToAdminWhoAreNotJoin = async (groupingDetail, supportEmail, openingId, title, retries = 3) => {
    let htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Template</title>
        <style>
            body {
                background-color: #f7fafc;
                color: #1a202c;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
                      'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                line-height: 1.6;
            }
            .container {
                margin: 0 auto;
            }
            .bg-white {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .text-center {
                text-align: center;
            }
            .logo {
                display: block;
                margin: 0 auto;
                margin-bottom: 20px;
            }
            .role {
                font-size: 17px; 
                font-weight: 600;
                color: #5a67d8;
                text-align: center;
                margin-bottom: 20px;
            }
            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            .info-table th,
            .info-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            .info-table th {
                background-color: #f7fafc;
                font-weight: 600;
                color: #4a5568;
                white-space: nowrap; 
                text-align: center;
            }
            .info-table td {
                background-color: #ffffff;
                white-space: nowrap; 
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="bg-white">
                <div class="text-center">
                    <img src="https://staging.zinterview.ai/zi-favicon.png" alt="logo" class="logo" width="50">
                </div>
                <h3 class="role">Role - ${title}</h3>
                <div class="overflow-x-auto">
                    <table class="info-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone Number</th>
                                <th>Experience</th>
                                <th>Schedule Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${groupingDetail?.map(info => `
                                <tr>
                                    <td >${info?.firstName} ${info?.lastName}</td>
                                    <td >${info?.email}</td>
                                    <td >${info?.phoneNumber}</td>
                                    <td >${info?.experience} years</td>
                                    <td >${getFormattedDateTime4(info?.schedule)}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    let mailOptions = {
        from: '"zinterview.ai support" <support@zinterview.ai>',
        to: supportEmail,
        subject: `${groupingDetail?.length} ${groupingDetail?.length <= 1 ? 'candidate' : 'candidates'} did not join for the opening with ID- ${openingId}.`,
        html: htmlTemplate,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            let info = await transporter.sendMail(mailOptions);
            console.log("Email sent to admin:", info.response);
            break;
        } catch (err) {
            console.error(`Attempt ${attempt} - Error sending Reminder email: `, err);
            if (attempt === retries) {
                console.error("Max retries reached. Failed to send email.");
            }
        }
    }
};

const sendEmailsToAllUsers = async () => {
    const now = new Date();
    try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        let { openings, userinterviewreports } = await dbconnect();

        const users = await userinterviewreports.find({
            $and: [
                { schedule: { $ne: '' } },
                {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$schedule" }, twentyFourHoursAgo] },
                            { $lt: [{ $toDate: "$schedule" }, now] }
                        ]
                    }
                }
            ],
            cancelled: false,
            interviewCompleted: false,
            activeSession: false
        }).project({ opening: 1, firstName: 1, lastName: 1, email: 1, phoneNumber: 1, experience: 1, schedule: 1 }).toArray();

        console.log("Total interviewReport ", users?.length);

        const groupedUsers = users?.reduce((acc, user) => {
            const openingId = user?.opening.toString();
            if (!acc[openingId]) {
                acc[openingId] = [];
            }
            acc[openingId].push(user);
            return acc;
        }, {});

        let openingIds = Object.keys(groupedUsers)?.map((data) => {
            return new ObjectId(data);
        });

        const openingInfo = await openings.find({ _id: { $in: openingIds } }).project({ supportEmail: 1, title: 1 }).toArray();
        console.log("openingInfo length -", openingInfo.length);

        for (const openingId of Object.keys(groupedUsers)) {
            let candidateInfo = groupedUsers?.[openingId];
            for (const openingData of openingInfo) {
                if (openingData?._id?.toString() === openingId && openingData?.supportEmail && openingData?.supportEmail?.length && candidateInfo?.length) {
                    await sendEmailToAdminWhoAreNotJoin(candidateInfo, openingData.supportEmail, openingId, openingData.title);
                }
            }
        }
        console.log("completed...");
        const response = {
            statusCode: 200,
            body: JSON.stringify(`Successfully completed sending email to the admin at ${getFormattedDateTime4(now)}.`),
        };
        return response;
    } catch (error) {
        console.error('Error sending email to admin ', error);
        const response = {
            statusCode: 500,
            body: JSON.stringify(`Getting issue while sending email to the admin at ${getFormattedDateTime4(now)}. 
            The error message is - ${error?.message}`),
        };
        return response;
    }
};

module.exports = { sendEmailsToAllUsers };
