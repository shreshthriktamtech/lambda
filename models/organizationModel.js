const mongoose = require("mongoose");
const organizationPlanSchema = require("./organizationPlanSchema");

const organizationSchema = new mongoose.Schema(
	{
		organizationName: {
			type: String,
			required: true,
		},
		contactInfo: {
			type: String,
			default: "",
		},
		orgLogoUrl: {
			type: String,
			default: "",
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		region: {
			type: String,
		},
		currency: {
			type: String,
			default: "INR",
		},
		paymentType: {
			type: String,
			enum: ["prepaid", "postpaid"],
			default: "prepaid",
		},
		tax: {
			type: Number,
			default: 18,
		},
		currentBalance: {
			type: Number,
			default: 0,
		},
		outstandingBalance: {
			type: Number,
			default: 0,
		},
		canOveruseInterviews: {
			type: Boolean,
			default: false,
		},
		pricingPlans: [
			{
				type: organizationPlanSchema,
			},
		],
		interviewRate: {
			type: Number,
			default: 0,
		},
		changePlanRequest: {
			isActive: {
				type: Boolean,
				default: false,
			},
			planId: {
				type: String,
			},
			requestedDate: {
				type: Date,
			},
		},
	},
	{ timestamps: true },
);

const organizationModel = mongoose.model("organizations", organizationSchema);

module.exports = organizationModel;
