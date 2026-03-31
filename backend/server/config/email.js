const nodemailer = require('nodemailer');

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rm6462041@gmail.com',
        pass: 'vxvi hpew ihkv zipm'
    }
});

module.exports = emailTransporter;