require('dotenv').config();  // Lataa ympäristömuuttujat .env-tiedostosta
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Ladataan ympäristömuuttuja salausavaimelle
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 tavun avain heksadesimaali
const IV_LENGTH = 16;  // IV (alustava vektori) on 16 tavua

// Polku datatiedostoon
const dataFilePath = path.join(__dirname, "data.json");

// Tarkistetaan, onko salausavain asetettu ympäristömuuttujaan
if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY ympäristömuuttuja ei ole asetettu.");
}

// Funktio, joka lataa ja purkaa salatun datan
const readData = () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const encryptedData = fs.readFileSync(dataFilePath, "utf8");
            const { iv, content } = JSON.parse(encryptedData);

            const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), Buffer.from(iv, "hex"));
            let decrypted = decipher.update(content, "hex", "utf8");
            decrypted += decipher.final("utf8");

            return JSON.parse(decrypted); // Palautetaan purettu data
        }

        // Palautetaan tyhjä data, jos tiedostoa ei ole
        return { rooms: {}, users: {} };
    } catch (error) {
        console.error("Virhe salatun datan lukemisessa:", error);
        throw new Error("Virhe salatun datan lukemisessa.");
    }
};

// Funktio, joka salaa ja tallentaa tiedot
const writeData = (data) => {
    try {
        const iv = crypto.randomBytes(IV_LENGTH); // Luodaan satunnainen IV
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);

        let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
        encrypted += cipher.final("hex");

        // Tallennetaan salattu data tiedostoon
        const encryptedData = JSON.stringify({ iv: iv.toString("hex"), content: encrypted });
        fs.writeFileSync(dataFilePath, encryptedData, "utf8");
    } catch (error) {
        console.error("Virhe salatun datan kirjoittamisessa:", error);
        throw new Error("Virhe salatun datan kirjoittamisessa.");
    }
};

// Funktio käyttäjän luomiseen
const createUser = async (username, password) => {
    const data = readData(); // Lataa tiedot

    // Tarkistetaan, onko käyttäjä jo olemassa
    if (data.users[username]) {
        throw new Error("Käyttäjä on jo olemassa.");
    }

    // Salataan salasana
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Lisätään uusi käyttäjä
    data.users[username] = { password: hashedPassword };

    // Tallennetaan data
    writeData(data);
    //remove after debugged
    console.log("User created");
};

// Funktio käyttäjän tunnistamiseen
const authenticateUser = async (username, password) => {
    const data = readData(); // Lataa tiedot

    // Tarkistetaan, onko käyttäjä olemassa
    if (!data.users[username]) {
        return false;
    }

    // Verrataan salasanaa
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Verrataan tallennettua salasanaa ja käyttäjän antamaa salasanaa
    return data.users[username].password === hashedPassword;
    console.log("User recognized");
};

// Funktio huoneen luomiseen
const createRoom = (roomID) => {
    const data = readData(); // Lataa tiedot

    // Tarkistetaan, onko huone jo olemassa
    if (data.rooms.some(room => room.id === roomID)) {
        throw new Error('Room already exists.');
    }

    // Luo uusi huone
    const newRoom = {
        id: roomID,
        users: []  // Aluksi huoneessa ei ole käyttäjiä
    };
    data.rooms.push(newRoom);  // Lisää huone listaan

    // Tallennetaan data
    writeData(data);
};

// Funktio liittymiseen huoneeseen
const joinRoom = (roomID, username) => {
    const data = readData(); // Lataa tiedot

    // Tarkistetaan, onko huone olemassa
    const room = data.rooms.find(r => r.id === roomID);
    if (!room) {
        throw new Error('Room does not exist.');
    }

    // Tarkistetaan, onko käyttäjä jo huoneessa
    if (room.users.includes(username)) {
        throw new Error('User already in room.');
    }

    // Lisää käyttäjä huoneeseen
    room.users.push(username);

    // Tallennetaan data
    writeData(data);
};

// Funktio huoneiden listaamiseen
const getRooms = () => {
    const data = readData(); // Lataa tiedot
    return data.rooms;  // Palautetaan huoneet
};

module.exports = { readData, writeData, createUser, authenticateUser, createRoom, joinRoom, getRooms };