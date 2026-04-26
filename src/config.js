require('dotenv').config();

module.exports = {
    apiId: parseInt(process.env.API_ID),
    apiHash: process.env.API_HASH,
    sessionString: process.env.SESSION_TOKEN,
    channels: [
        'MILITARYTODAYIR',
        'persian_trend_official',
        'TweetyChannel',
        'chavoshin',
        'jangaavaran1390',
        'putakk',
        'pouriazeraati',
        'VahidOnline',
        'IranintlTV',
        'OfficialRezaPahlavi',
        'netblocks',
        'ircfspace',
        'ScorchSword',
        'TechTube',
        'MatinSenPaii',
        'mitivpn',
        'JinxFamily',
        'CDSTOP',
        'PS_Family2',
        'WeebsDungeon',
    ]
};

