const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: "dkv3jtyrv",
    api_key: "842557168467715",
    api_secret: "VwIcCXuqS0LcJXJVVFdi6ulrhIk"
});

module.exports = cloudinary;