const bcrypt = require('bcryptjs');

async function generateHashedPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log(hashedPassword); // Copy this hashed password and insert it into MongoDB Compass
}

async function comparePassword(passOne, passTwo) {
    const res = await bcrypt.compare(passOne, passTwo);
    return res;
}

// generateHashedPassword('').then(password => console.log(password));

comparePassword("hieu123", "$2a$10$3bZ8ZCKoflnPh6U5tF12B.bahwofWLNBFIDdxQYatgF64aHgXZTde").then(res => console.log(res));



