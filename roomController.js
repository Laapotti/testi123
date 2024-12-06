const { readData, writeData } = require('./dataManager');

// Funktio huoneen luomiseen
const createRoom = async (req, res) => {
    try {
        const { roomID } = req.body;

        if (!roomID) {
            return res.status(400).json({ error: 'Huoneen ID ei voi olla tyhjä.' });
        }

        const data = readData(); // Lataa nykyinen data

        // Varmista, että rooms on taulukko
        if (!Array.isArray(data.rooms)) {
            data.rooms = [];  // Alustetaan tyhjä taulukko, jos ei ole
        }

        // Tarkistetaan, onko huone jo olemassa
        if (data.rooms.some(room => room.roomID === roomID)) {
            return res.status(400).json({ error: 'Huone on jo olemassa.' });
        }

        // Luodaan uusi huone ja lisätään se listaan
        const newRoom = { roomID: roomID, users: [] };
        data.rooms.push(newRoom);

        // Tallennetaan päivitettu data
        writeData(data);

        return res.status(201).json({ message: 'Huone luotu onnistuneesti!', roomID });
    } catch (error) {
        console.error('Error creating room:', error); // Lisää virheiden tulostus konsoliin virheiden jäljittämistä varten
        return res.status(500).json({ error: 'Virhe huoneen luomisessa.' });
    }
};


// Huoneiden listaamiseen
const listRooms = async (req, res) => {
    try {
        const data = readData(); // Lataa nykyinen data
        return res.status(200).json({ rooms: data.rooms || [] }); // Palautetaan huoneet oikeassa muodossa
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return res.status(500).json({ error: 'Virhe huoneiden hakemisessa.' });
    }
};

module.exports = { createRoom, listRooms };
