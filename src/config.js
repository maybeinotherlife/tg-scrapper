require('dotenv').config();

module.exports = {
    apiId: parseInt(process.env.API_ID),
    apiHash: process.env.API_HASH,
    sessionString: process.env.SESSION_TOKEN,
    channels: [
        {username: 'MILITARYTODAYIR', maxAllowedFileSizeMb: 80},
        {username: 'persian_trend_official', maxAllowedFileSizeMb: 80},
        {username: 'TweetyChannel', maxAllowedFileSizeMb: 80},
        {username: 'chavoshin', maxAllowedFileSizeMb: 80},
        {username: 'jangaavaran1390', maxAllowedFileSizeMb: 80},
        {username: 'putakk', maxAllowedFileSizeMb: 3},
        {username: 'pouriazeraati', maxAllowedFileSizeMb: 80},
        {username: 'VahidOnline', maxAllowedFileSizeMb: 80},
        {username: 'MatinSenPaii', maxAllowedFileSizeMb: 80},
        {username: 'IranintlTV', maxAllowedFileSizeMb: 3},
        {username: 'netblocks', maxAllowedFileSizeMb: 80},
        {username: 'ircfspace', maxAllowedFileSizeMb: 80},
        {username: 'TechTube', maxAllowedFileSizeMb: 80},
        {username: 'factnameh', maxAllowedFileSizeMb: 80},
        {username: 'MoradVaisiPodcasts', maxAllowedFileSizeMb: 80},
        {username: 'OfficialRezaPahlavi', maxAllowedFileSizeMb: 80},
        {username: 'mitivpn', maxAllowedFileSizeMb: 80},
        // {username: 'JinxFamily', maxAllowedFileSizeMb: 90},
        // {username: 'CDSTOP', maxAllowedFileSizeMb: 90},
        // {username: 'PS_Family2', maxAllowedFileSizeMb: 90},
    ]
};

