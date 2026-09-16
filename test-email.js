const sendEmail = require('./src/utils/sendEmail');
require('dotenv').config();

async function testEmail() {
    console.log('Testing email configuration...');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('User:', process.env.EMAIL_USER);

    try {
        await sendEmail({
            email: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test Email from Spider-App',
            message: 'If you see this, your SMTP configuration is working correctly.',
            html: '<h1>Success!</h1><p>Your SMTP configuration is working correctly.</p>'
        });
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('\nTip: Make sure you have provided valid credentials in backend/.env');
        console.log('If using Gmail, ensure you use an "App Password", NOT your regular password.');
    }
}

testEmail();
