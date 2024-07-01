const cron = require('node-cron');
const moment = require('moment');
const nodemailer = require('nodemailer');
const aws = require("@aws-sdk/client-ses");
const ics = require("ics");
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

const scheduledTasks = {};

const sendEmail = (email, scheduleTime, openingTitle, orgName, uid, supportEmail, interviewUrl) => {
    const scheduleDate = new Date(scheduleTime);
    const year = scheduleDate.getUTCFullYear();
    const month = scheduleDate.getUTCMonth() + 1;
    const day = scheduleDate.getUTCDate();
    const hour = scheduleDate.getUTCHours();
    const minute = scheduleDate.getUTCMinutes();

    console.log(email, scheduleTime, openingTitle, orgName, uid, supportEmail, interviewUrl)

    const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${orgName} ${openingTitle} Interview</title>
            <style>
                .container {
                    max-width: 100%;
                    margin-right: auto;
                    margin-left: auto;
                    padding-right: 1rem;
                    padding-left: 1rem;
                }

                .bg-gray-100 {
                    background-color: #f3f4f6;
                }

                .max-w-2xl {
                    max-width: 42rem;
                }

                .mx-auto {
                    margin-right: auto;
                    margin-left: auto;
                }

                .bg-white {
                    background-color: #ffffff;
                }

                .p-8 {
                    padding: 2rem;
                }

                .shadow-md {
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                        0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                .rounded-md {
                    border-radius: 0.375rem;
                }

                .mb-8 {
                    margin-bottom: 2rem;
                }

                .text-2xl {
                    font-size: 1.2rem;
                    line-height: 2rem;
                    color: 'green';
                }

                .font-semibold {
                    font-weight: 600;
                }

                .text-gray-800 {
                    color: #2d3748;
                }

                .mb-4 {
                    margin-bottom: 1rem;
                }

                .text-lg {
                    font-size: 1.125rem;
                    line-height: 1.75rem;
                }

                .text-gray-700 {
                    color: #4a5568;
                }

                .mb-6 {
                    margin-bottom: 1.5rem;
                }

                .text-blue-600 {
                    color: #2563eb;
                }

                .pl-8 {
                    padding-left: 2rem;
                }

                .list-disc {
                    list-style-type: disc;
                    padding-left: 1rem;
                }

                .mb-12 {
                    margin-bottom: 3rem;
                }

                .text-center {
                    text-align: center;
                }

                .font-sans {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
                      'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                }
            </style>
        </head>
        <body class="bg-gray-100 font-sans">
            <div class="container mx-auto py-12">
                <div class="max-w-2xl mx-auto bg-white p-8 shadow-md rounded-md">
                    <div class="text-center mb-8">
                       <img src="https://staging.zinterview.ai/zi-favicon.png" alt="logo" class="mx-auto mb-8" width="50">
                    </div>
                    <p class="text-2xl font-semibold text-gray-500 mb-4">Hello,
                    This is a reminder that your interview is scheduled and we're looking forward to meeting with you.
                    Best of luck in your interview!</p>
                    <p class="text-lg text-blue-600 mb-6">Interview Link: <a href="${interviewUrl}" target="_blank" rel="noopener noreferrer">${interviewUrl}</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
    const event = {
        start: [year, month, day, hour, minute],
        startInputType: "utc",
        duration: { hours: 1 },
        title: `${orgName} ${openingTitle} Interview`,
        status: "CONFIRMED",
        busyStatus: "BUSY",
        organizer: { name: "zinterview.ai", email: "support@zinterview.ai" },
        uid: uid.toString(),
        sequence: 0,
    };

    ics.createEvent(event, (error, value) => {
        if (error) {
            return;
        }
        let mailOptions = {
            from: '"zinterview.ai support" <support@zinterview.ai>',
            to: email,
            subject: `Interview Reminder`,
            html: htmlTemplate,
            icalEvent: {
                filename: "interview.ics",
                method: "request",
                content: value,
            },
        };
        if (supportEmail?.length) {
            mailOptions.cc = supportEmail
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending Reminder email:", err);
            } else {
                console.log("Reminder email sent:", info.response);
            }
        });
    });
};

const sendRemaindarEmail = (
    {
        candidateId,
        email,
        schedule,
        openingTitle,
        orgName,
        supportEmail,
        interviewUrl,
        isCancel
    }) => {
    try {
        if (scheduledTasks[candidateId]) {
            scheduledTasks[candidateId].forEach(task => task.stop());
            delete scheduledTasks[candidateId];
        }
        if (isCancel === true) {
            return;
        }
        let reminders = [];
        let now = new Date();
        now.setHours(now.getHours() + 1);

        let scheduledate = new Date(schedule);
        let afterOneHour = new Date(now);
        if (scheduledate >= afterOneHour) {
            reminders.push(moment(schedule).subtract(1, 'hours').toDate());
        }
        now = new Date();
        now.setHours(now.getHours() + 6);
        let afterSixHour = new Date(now);
        if (scheduledate >= afterSixHour) {
            reminders.push(moment(schedule).subtract(6, 'hours').toDate());
        }

        scheduledTasks[candidateId] = [];
        reminders.forEach(time => {
            const cronTime = moment(time).format('m H D M d');
            const task = cron.schedule(cronTime, () => {
                sendEmail(email, schedule, openingTitle, orgName, candidateId, supportEmail, interviewUrl);
                console.log("Go for scheduling -- ", getFormattedDateTime4(cronTime));
            }, {
                scheduled: true,
                timezone: 'Asia/Kolkata'
            });
            scheduledTasks[candidateId].push(task);
        });
    } catch (error) {
        console.log("Error while sendRemaindarOrCancelMessageByEmail- ", error);
    }
};

const OnetimeGetUserToSendReminderEmail = async () => {
    try {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        let { openings, userinterviewreports, organizations } = await dbconnect();

        let userInterviewReports = await userinterviewreports.find({
            $and: [
                { schedule: { $ne: '' } },
                {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$schedule" }, now] }
                        ]
                    }
                }
            ],
            cancelled: false,
            interviewCompleted: false,
            activeSession: false,
        }).project({ opening: 1, email: 1, schedule: 1, resumeToken: 1 }).toArray();

        let opeaningIds = userInterviewReports.map((data) => {
            return new ObjectId(data?.opening);
        });
        console.log("successfull find userInterviewReports", userInterviewReports.length);
        let opeaningData = await openings?.find({ _id: { $in: opeaningIds } }).project({ organizationId: 1, supportEmail: 1, title: 1 }).toArray();
        console.log("successfull find opeaningData", opeaningData.length);
        let organizationIds = opeaningData?.map((data) => { return data?.organizationId });
        let organizationData = await organizations?.find({ _id: { $in: organizationIds } }).project({ organizationName: 1 }).toArray();
        console.log("successfull find organizationData", organizationData.length);

        userInterviewReports?.forEach((eachUserInterviewReport) => {
            opeaningData?.forEach((eachOpening) => {
                organizationData?.forEach((eachOrganization) => {
                    if (eachUserInterviewReport?.opening?.toString() === eachOpening?._id?.toString()
                        && eachOpening?.organizationId?.toString() === eachOrganization?._id?.toString()) {
                        let interviewUrl = ``;
                        if (process.env.NODE_ENV === "development") interviewUrl += `http://localhost:3000/`;
                        else interviewUrl += `https://zinterview.ai/`;
                        interviewUrl += `interview/${eachOpening?._id}/start/${eachUserInterviewReport?._id}/${eachUserInterviewReport?.resumeToken}`;
                        let obj = {
                            candidateId: eachUserInterviewReport?._id,
                            email: eachUserInterviewReport?.email,
                            schedule: eachUserInterviewReport?.schedule,
                            openingTitle: eachOpening?.title,
                            orgName: eachOrganization?.organizationName,
                            supportEmail: eachOpening?.supportEmail,
                            interviewUrl: interviewUrl,
                            isCancel: false,
                        }
                        console.log("send for scheduling---");
                        sendRemaindarEmail(obj);
                    }
                })
            })
        })
        const response = {
            statusCode: 200,
            body: JSON.stringify(`sucessfull`),
        };
        return response;
    } catch (error) {
        console.log("Error in getAllEmailForSendReminderEmail function", error);
        const response = {
            statusCode: 400,
            body: JSON.stringify(`unsuccessfull`),
        };
        return response;
    }
}

module.exports = {
    OnetimeGetUserToSendReminderEmail,
};
