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

const sendEmailToAdminWhoAreNotJoin = async (groupingDetail, supportEmail, openingId, title) => {

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
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 6px;
            }
            .bg-white {
                background-color: #ffffff;
            }
            .shadow-md {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .rounded-lg {
                border-radius: 8px;
            }
            .p-6 {
                padding: 24px;
            }
            .text-xl {
                text-align: center
            }
            .font-bold {
                font-weight: 700;
            }
            .text-indigo-600 {
                color: #5a67d8;
            }
            .mb-4 {
                margin-bottom: 16px;
            }
            .overflow-x-auto {
                overflow-x: auto;
            }
            .min-w-full {
                min-width: 100%;
            }
            .border-b {
                border-bottom: 1px solid #e2e8f0;
            }
            .border-gray-300 {
                border-color: #e2e8f0;
            }
            .py-2 {
                padding-top: 8px;
                padding-bottom: 8px;
            }
            .px-4 {
                padding-left: 16px;
                padding-right: 16px;
            }
            .text-center{
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="bg-white shadow-md rounded-lg p-6">`;
    htmlTemplate += `
                            <div class="mb-6">
                                <div class="text-center mb-6">
                                <img src="https://staging.zinterview.ai/zi-favicon.png" alt="logo" class="mx-auto mb-8" width="50">
                                </div>
                                <h3 class="text-xl font-bold text-indigo-600 mb-4">Role- ${title}</h3>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full bg-white">
                                        <thead>
                                            <tr>
                                                <th class="py-2 px-4 border-b border-gray-300">Full Name</th>
                                                <th class="py-2 px-4 border-b border-gray-300">Email</th>
                                                <th class="py-2 px-4 border-b border-gray-300">Phone Number</th>
                                                <th class="py-2 px-4 border-b border-gray-300">Experience</th>
                                                <th class="py-2 px-4 border-b border-gray-300">Schedule Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
    groupingDetail.forEach(info => {
        htmlTemplate += `
                                            <tr>
                                                <td class="py-2 px-4 border-b border-gray-300">${info.fullName}</td>
                                                <td class="py-2 px-4 border-b border-gray-300">${info.email}</td>
                                                <td class="py-2 px-4 border-b border-gray-300">${info.phoneNumber}</td>
                                                <td class="py-2 px-4 border-b border-gray-300">${info.experience} years</td>
                                                <td class="py-2 px-4 border-b border-gray-300">${info.schedule}</td>
                                            </tr>`;
    });
    htmlTemplate += `
                            </tbody>
                        </table>
                    </div>
                </div>`;

    htmlTemplate += `
            </div>
        </div>
    </body>
    </html>`;

    let mailOptions = {
        from: '"zinterview.ai support" <support@zinterview.ai>',
        to: supportEmail,
        subject: `Total ${groupingDetail?.length} candidates were not join with opening ID - ${openingId}.`,
        html: htmlTemplate,
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error("Error sending Reminder email: ", err);
        } else {
            console.log("Email send to admin : ", info.response);
        }
    });
}

const sendEmailsToAllUsers = async () => {
    try {
        const now = new Date();
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
        }).project({ opening: 1, firstName: 1, lastName: 1, email: 1, phoneNumber: 1, }).toArray();

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

        let groupingDetail = [];
        Object.keys(groupedUsers)?.forEach(openingId => {
            const usersInGroup = groupedUsers?.[openingId];
            let candidateInfo = usersInGroup?.map(user => ({
                fullName: `${user?.firstName} ${user?.lastName}`,
                email: user?.email,
                phoneNumber: user?.phoneNumber,
                experience: user?.experience,
                schedule: getFormattedDateTime4(user?.schedule)
            }));
            groupingDetail.push({
                openingId,
                candidateInfo
            });
        });

        groupingDetail.forEach(groupingData => {
            openingInfo.forEach(openingData => {
                if (groupingData?.openingId === openingData?._id.toString()) {
                    if (openingData?.supportEmail && openingData?.supportEmail?.length) {
                        sendEmailToAdminWhoAreNotJoin(groupingData.candidateInfo, openingData.supportEmail, groupingData.openingId, openingData.title);
                    }
                }
            });
        });

    } catch (error) {
        console.error('Error sending to email to admin-', error);
    }
}

module.exports = { sendEmailsToAllUsers }
