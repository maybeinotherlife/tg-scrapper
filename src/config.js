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
        'pouriazeraati',
        'VahidOnline',
        'IranintlTV',
        'OfficialRezaPahlavi',
        'netblocks',
        'ircfspace',
        'khabarfuri',
        'mitivpn',
        'putakk',
        'JinxFamily',
        'CDSTOP',
        'PS_Family2',
        'WeebsDungeon',
    ]
};
