// src/index.js
const { TelegramClient, Api} = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const config = require('./config');

const client = new TelegramClient(
    new StringSession(config.sessionString),
    config.apiId,
    config.apiHash,
    { connectionRetries: 5 }
);

async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);
        console.log(`📁 Directory exists: ${dirPath}`);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Directory created: ${dirPath}`);
    }
}

async function loadJSON(filePath, defaultValue = null) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        console.log(`📄 Loaded JSON: ${filePath}`);
        return JSON.parse(data);
    } catch {
        console.log(`📄 JSON file not found, using default: ${filePath}`);
        return defaultValue;
    }
}

async function calculateTotalSize(dirPath) {
    let totalSize = 0;

    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else {
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
            }
        }
    }

    try {
        await scanDir(dirPath);
    } catch (error) {
        console.log(`⚠️ Error calculating size: ${error.message}`);
    }

    return totalSize;
}

async function getAllMediaFiles(dataDir) {
    const mediaFiles = [];

    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if(entry.name.startsWith('profile')){
                continue;
            }
            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.gif', '.mp4','.mp3', '.mov', '.avi', '.pdf', '.zip', '.rar'].includes(ext)) {
                    const stats = await fs.stat(fullPath);
                    mediaFiles.push({
                        path: fullPath,
                        size: stats.size,
                        mtime: stats.mtime.getTime()
                    });
                }
            }
        }
    }

    try {
        await scanDir(dataDir);
    } catch (error) {
        console.log(`⚠️ Error scanning media files: ${error.message}`);
    }

    // مرتب‌سازی بر اساس قدیمی‌ترین
    return mediaFiles.sort((a, b) => a.mtime - b.mtime);
}


// پاک کردن فایل‌های قدیمی تا رسیدن به حد مجاز
async function cleanupOldMedia(dataDir, maxSizeBytes) {
    const currentSize = await calculateTotalSize(dataDir);
    const currentSizeMB = (currentSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);

    console.log(`💾 Current data size: ${currentSizeMB} MB / ${maxSizeMB} MB`);

    if (currentSize <= maxSizeBytes) {
        return;
    }

    console.log(`🧹 Data size exceeded limit, cleaning up old media files...`);

    const mediaFiles = await getAllMediaFiles(dataDir);
    let freedSpace = 0;
    let deletedCount = 0;

    // پاک کردن فایل‌ها تا رسیدن به 80% حد مجاز (برای ایجاد فضای کافی)
    const targetSize = maxSizeBytes * 0.8;

    for (const file of mediaFiles) {
        if (currentSize - freedSpace <= targetSize) {
            break;
        }

        try {
            await fs.unlink(file.path);
            freedSpace += file.size;
            deletedCount++;
            console.log(`🗑️ Deleted: ${path.basename(file.path)} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        } catch (error) {
            console.log(`⚠️ Failed to delete ${file.path}: ${error.message}`);
        }
    }

    const freedMB = (freedSpace / (1024 * 1024)).toFixed(2);
    console.log(`✅ Cleanup complete: ${deletedCount} files deleted, ${freedMB} MB freed`);
}

async function saveJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Saved JSON: ${filePath}`);
}

async function downloadMedia(message, channelDir,maxAllowedFileSizeMb) {
    if (!message.media) return null;

    try {
        const mediaSize = message.media.document?.size ||
            message.media.photo?.sizes?.slice(-1)[0]?.size || 0;

        const mediaSizeMB = mediaSize / (1024 * 1024);

        if (mediaSizeMB > maxAllowedFileSizeMb) {
            console.log(`⏭️  Skipping large file: ${mediaSizeMB.toFixed(2)} MB (> ${maxAllowedFileSizeMb} MB)`);
            return null;
        }

        let extension = '';

        if (message.media.photo) {
            extension = '.jpg';
        }

        if (message.media.document) {
            const mimeType = message.media.document.mimeType || '';

            const mimeMap = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',

                'video/mp4': '.mp4',
                'video/quicktime': '.mov',
                'video/x-matroska': '.mkv',

                'audio/mpeg': '.mp3',
                'audio/ogg': '.ogg',
                'audio/ogg; codecs=opus': '.ogg',
                'audio/x-wav': '.wav',
                'audio/mp4': '.m4a',

                'application/pdf': '.pdf',
                'application/zip': '.zip',
                'application/x-rar': '.rar',
                'text/plain': '.txt'
            };

            extension = mimeMap[mimeType] || '';

            if (!extension && message.media.document.attributes) {
                for (const attr of message.media.document.attributes) {
                    if (attr.fileName) {
                        const match = attr.fileName.match(/\.([^.]+)$/);
                        if (match) {
                            extension = '.' + match[1].toLowerCase();
                            break;
                        }
                    }
                }
            }

            if (!extension) {
                extension = '.bin';
            }
        }

        console.log(`⬇️  Downloading: ${mediaSizeMB.toFixed(2)} MB...`);

        let lastProgress = 0;
        const buffer = await client.downloadMedia(message, {
            progressCallback: (received, total) => {
                const progress = Math.floor((received / total) * 100);

                if (progress >= lastProgress + 10 || progress === 100) {
                    const receivedMB = (received / (1024 * 1024)).toFixed(2);
                    const totalMB = (total / (1024 * 1024)).toFixed(2);
                    console.log(`   📊 Progress: ${progress}% (${receivedMB}/${totalMB} MB)`);
                    lastProgress = progress;
                }
            }
        });

        if (buffer) {
            const fileName = `media_${message.id}${extension}`;
            const filePath = path.join(channelDir, fileName);

            await fs.writeFile(filePath, buffer);

            console.log(`✅ Downloaded: ${fileName} (${mediaSizeMB.toFixed(2)} MB)`);
            return fileName;
        }

    } catch (error) {
        console.log(`❌ Error downloading media: ${error.message}`);
    }

    return null;
}

async function buildIndex() {
    const base = path.join(__dirname, '../data/channels');

    try {
        const channels = config.channels;
        const output = [];

        for (const {username:ch,maxAllowedFileSizeMb} of channels) {
            const infoPath = path.join(base, ch, 'info.json');
            const messagesPath = path.join(base, ch, 'messages.json');

            try {
                const infoData = await fs.readFile(infoPath, 'utf8');
                const info = JSON.parse(infoData);

                let lastMessage = null;

                // خواندن آخرین پیام از messages.json
                try {
                    const messagesData = await fs.readFile(messagesPath, 'utf8');
                    const messages = JSON.parse(messagesData);

                    if (messages.length > 0) {
                        lastMessage = messages[messages.length - 1];
                    }
                } catch (err) {
                    // اگر messages.json نبود یا خالی بود
                }

                output.push({
                    id: info.id,
                    name: ch,
                    title: info.title,
                    username: info.username,
                    participantsCount: info.participantsCount,
                    lastMessageDate: info.lastMessageDate,
                    profilePhoto: info.profilePhoto,
                    lastUpdated: info.lastUpdated,
                    lastMessage: lastMessage
                });
            } catch (err) {
                continue;
            }
        }

        const indexPath = path.join(__dirname, '../data/index.json');
        await fs.writeFile(indexPath, JSON.stringify(output, null, 2));
        console.log(`✅ Index built with ${output.length} channels`);

    } catch (error) {
        console.log('⚠️  No channels directory found');
    }
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}


async function processChannel(channel) {
    const {username:channelUsername,maxAllowedFileSizeMb} = channel
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Processing channel: @${channelUsername}`);
    console.log(`${'='.repeat(60)}`);

    const dataDir = path.join(__dirname, '..', 'data');
    const channelsDir = path.join(dataDir, 'channels');
    const channelDir = path.join(channelsDir, channelUsername);

    await ensureDir(channelDir);

    const infoPath = path.join(channelDir, 'info.json');
    const messagesPath = path.join(channelDir, 'messages.json');

    let channelInfo = await loadJSON(infoPath, {
        lastMessageId: 0,
        title: '',
        username: channelUsername,
        participantsCount: 0,
        profilePhoto: null,
        lastUpdated: null
    });

    let existingMessages = await loadJSON(messagesPath, []);
    console.log(`📊 Existing messages count: ${existingMessages.length}`);

    console.log(`🔍 Fetching channel entity: @${channelUsername}`);
    const entity = await client.getEntity(channelUsername);
    console.log(`✅ Channel entity fetched: ${entity.title}`);

    // به‌روزرسانی اطلاعات کانال
    console.log(`📝 Updating channel info...`);
    channelInfo.title = entity.title;
    channelInfo.username = entity.username || channelUsername;
    let participantsCount = 0;
    try {
        participantsCount = await client.invoke(
            new Api.channels.GetFullChannel({ channel: entity })
        ).then(fullChannel => fullChannel.fullChat.participantsCount || 0);
    } catch (error) {
        console.log(`⚠️  Can't get members count: ${error.message}`);
    }
    channelInfo.participantsCount = participantsCount;

    channelInfo.lastUpdated = new Date().toISOString();
    console.log(`✅ Channel info updated`);
    console.log(`   Title: ${channelInfo.title}`);
    console.log(`   Participants: ${channelInfo.participantsCount}`);

    // دانلود عکس پروفایل (فقط اگر قبلاً دانلود نشده)
    const photoPath = path.join(channelDir, 'profile.jpg');

    if (!(await fileExists(photoPath))) {
        try {
            console.log(`📸 Downloading profile photo...`);

            const buffer = await client.downloadProfilePhoto(entity);

            if (buffer) {
                await fs.writeFile(photoPath, buffer);
                channelInfo.profilePhoto = 'profile.jpg';
                console.log(`✅ Profile photo downloaded`);
            } else {
                console.log(`⚠️ No profile photo`);
            }

        } catch (error) {
            console.log(`⚠️ Could not download profile photo: ${error.message}`);
        }
    }

    console.log(`📥 Fetching last 20 messages...`);
    const messages = await client.getMessages(entity, { limit: 20 });
    console.log(`✅ Fetched ${messages.length} messages`);

    const newMessages = messages.filter(msg => msg.id > channelInfo.lastMessageId);
    console.log(`🆕 New messages detected: ${newMessages.length}`);

    let maxMessageId = channelInfo.lastMessageId;

    for (const message of newMessages.reverse()) {
        console.log(`\n➡️  Processing message ID: ${message.id}`);

        const messageData = {
            id: message.id,
            date: new Date(message.date * 1000).toISOString(),
        };

        if (message.text && !message.media) {
            messageData.text = message.text;
            console.log(`📝 Text message saved`);
        }

        if (message.media) {
            const mediaFile = await downloadMedia(message, channelDir,maxAllowedFileSizeMb);
            if (mediaFile) {
                messageData.media = mediaFile;
            }

            if (message.text) {
                messageData.caption = message.text;
                console.log(`📝 Caption saved`);
            }
        }

        existingMessages.push(messageData);

        console.log(`✅ Message ${message.id} stored`);

        if (message.id > maxMessageId) {
            maxMessageId = message.id;
        }
    }

    // بروزرسانی lastMessageId
    if (maxMessageId > channelInfo.lastMessageId) {
        channelInfo.lastMessageId = maxMessageId;
        console.log(`🔢 Updated lastMessageId: ${channelInfo.lastMessageId}`);
    } else {
        console.log(`ℹ️  No new message IDs to update`);
    }

    await saveJSON(messagesPath, existingMessages.slice(1).slice(-200));
    await saveJSON(infoPath, channelInfo);

    // const MAX_ALLOWED_PROJECT_FILES_SIZE = (1.8) * 1024 * 1024 * 1024;
    const MAX_ALLOWED_PROJECT_FILES_SIZE = (.5) * 1024 * 1024 * 1024;
    await cleanupOldMedia(dataDir, MAX_ALLOWED_PROJECT_FILES_SIZE);

    console.log(`✅ Channel processing completed: @${channelUsername}`);
}


async function main() {
    console.log(`🚀 Starting Telegram scraper...`);
    console.log(`🔌 Connecting to Telegram...`);

    await client.start({
        phoneNumber: ()=>{},
        password: ()=>{},
        phoneCode: ()=>{},
        onError: (err) => console.log(err),
    });
    console.log(`✅ Connected to Telegram`);

    for (const channel of config.channels) {
        await processChannel(channel);
    }

    console.log(`\n🎯 All channels processed successfully`);

    await buildIndex()

    console.log(`🛑 Exiting process...`);
    process.exit(0);
}

main().catch(error => {
    console.error(`❌ Fatal error:`, error);
    process.exit(1);
});
