const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { CloudWatchEventsClient, PutRuleCommand, PutTargetsCommand, RemoveTargetsCommand, DeleteRuleCommand, ListRulesCommand, ListTargetsByRuleCommand } = require('@aws-sdk/client-cloudwatch-events');
const { LambdaClient, AddPermissionCommand } = require('@aws-sdk/client-lambda');
const moment = require('moment');

// let AWS_REGION = 'us-east-1';
// let LAMBDA_ARN = 'arn:aws:lambda:us-east-1:767398113177:function:SendEmailEveryFiveMinutes';
// let LAMBDA_NAME = 'SendEmailEveryFiveMinutes';
// let AWS_ACCOUNT_ID = '767398113177';

const sesClient = new SESClient({ region: AWS_REGION });
const cloudWatchEventsClient = new CloudWatchEventsClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });

const Demo = async (
    candidateId,
    email,
    schedule,
    openingTitle,
    orgName,
    supportEmail,
    interviewUrl,
    isCancel
) => {
    await cancelScheduledEvents(candidateId);
    if (isCancel) {
        return;
    }
    const reminders = calculateReminders(schedule);
    console.log(reminders);
    for (const time of reminders) {
        const ruleName = `reminder_${candidateId}_${time.getTime()}`;
        await scheduleEvent(ruleName, time, {
            candidateId,
            email,
            schedule,
            openingTitle,
            orgName,
            supportEmail,
            interviewUrl
        });
    }
};

const calculateReminders = (schedule) => {
    const reminders = [];
    const scheduleDate = new Date(schedule);

    const oneHourBefore = moment(schedule).subtract(1, 'hours').toDate();
    if (new Date() <= oneHourBefore) {
        reminders.push(oneHourBefore);
    }
    const sixHoursBefore = moment(schedule).subtract(6, 'hours').toDate();
    if (new Date() <= sixHoursBefore) {
        reminders.push(sixHoursBefore);
    }
    return reminders;
};

const scheduleEvent = async (ruleName, time, event) => {
    const ruleParams = {
        Name: ruleName,
        ScheduleExpression: `cron(${time.getUTCMinutes()} ${time.getUTCHours()} ${time.getUTCDate()} ${time.getUTCMonth() + 1} ? ${time.getUTCFullYear()})`,
        State: 'ENABLED',
    };

    try {
        await cloudWatchEventsClient.send(new PutRuleCommand(ruleParams));
    } catch (error) {
        if (error.name === 'ResourceConflictException') {
            console.log(`Rule ${ruleName} already exists.`);
        } else {
            throw error;
        }
    }

    const targetParams = {
        Rule: ruleName,
        Targets: [
            {
                Id: '1',
                Arn: LAMBDA_ARN,
                Input: JSON.stringify(event),
            },
        ],
    };
    await cloudWatchEventsClient.send(new PutTargetsCommand(targetParams));

    const permissionParams = {
        Action: 'lambda:InvokeFunction',
        FunctionName: LAMBDA_NAME,
        Principal: 'events.amazonaws.com',
        SourceArn: `arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/${ruleName}`,
        StatementId: `${ruleName}-Permission`,
    };
    await lambdaClient.send(new AddPermissionCommand(permissionParams));
    await sendEmail(event);
};

const cancelScheduledEvents = async (candidateId) => {
    const rules = await cloudWatchEventsClient.send(new ListRulesCommand({ NamePrefix: `reminder_${candidateId}` }));

    for (const rule of rules.Rules) {
        const ruleName = rule.Name;

        const targets = await cloudWatchEventsClient.send(new ListTargetsByRuleCommand({ Rule: ruleName }));
        const targetIds = targets.Targets.map(target => target.Id);

        await cloudWatchEventsClient.send(new RemoveTargetsCommand({ Rule: ruleName, Ids: targetIds }));
        await cloudWatchEventsClient.send(new DeleteRuleCommand({ Name: ruleName }));
    }
};

const sendEmail = async ({ email, schedule, openingTitle, orgName, candidateId, supportEmail, interviewUrl }) => {
    const params = {
        Source: supportEmail,
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: `Interview Reminder: ${openingTitle} at ${orgName}`,
            },
            Body: {
                Text: {
                    Data: ` Dear Candidate,
                            This is a reminder for your upcoming interview scheduled on ${schedule}.
                            Please join using the following link: ${interviewUrl}
                            Best Regards,
                            ${orgName} Team`,
                },
            },
        },
    };

    try {
        await sesClient.send(new SendEmailCommand(params));
        console.log(`Email sent successfully to ${email}`);
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        throw error;
    }
};

Demo(1, 'bg5050525@gmail.com', '2024-07-01T17:17:00+05:30', 'sde', 'riktam', 'biswajit@riktamtech.com', 'https://chatgpt.com/c/272d360d-39ff-4284-9eda-796e8d02c397', false);


module.exports = {
    Demo
}