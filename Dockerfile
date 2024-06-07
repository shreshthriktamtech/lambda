# Use the official AWS Lambda Node.js base image
FROM public.ecr.aws/lambda/nodejs:18

# Set the working directory
WORKDIR /var/task

# Copy the function code
COPY . .

# Install dependencies
RUN npm install

# Command to run the Lambda function
CMD ["index.handler"]
