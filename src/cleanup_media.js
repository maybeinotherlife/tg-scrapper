const fs = require('fs').promises;
const path = require('path');

async function cleanAllMedia(withData = false) {
    const dataDir = path.join(__dirname, '..', 'data', 'channels');

    try {
        const channels = await fs.readdir(dataDir);
        let totalDeleted = 0;
        let totalSize = 0;

        for (const channel of channels) {
            const channelPath = path.join(dataDir, channel);
            const stat = await fs.stat(channelPath);

            if (!stat.isDirectory()) continue;

            const files = await fs.readdir(channelPath);

            for (const file of files) {
                let shouldDelete = false;

                // فایل‌های مدیا
                if (file.startsWith('media_') ||
                    /\.(jpg|jpeg|png|gif|mp4|mov|pdf|zip|webp|mp3|ogg)$/i.test(file)) {

                    // فایل‌های سیستمی رو نگه دار
                    if (file === 'profile.jpg') continue;

                    shouldDelete = true;
                }

                // اگر withData فعال باشه، فایل‌های JSON هم پاک شن
                if (withData && (file === 'info.json' || file === 'messages.json')) {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    const filePath = path.join(channelPath, file);
                    const fileStats = await fs.stat(filePath);
                    const sizeMB = fileStats.size / (1024 * 1024);

                    await fs.unlink(filePath);
                    totalDeleted++;
                    totalSize += sizeMB;

                    console.log(`🗑️  Deleted: ${channel}/${file} (${sizeMB.toFixed(2)} MB)`);
                }
            }
        }

        console.log(`\n✅ Cleanup complete!`);
        console.log(`   Mode: ${withData ? 'WITH DATA (media + JSON)' : 'MEDIA ONLY'}`);
        console.log(`   Files deleted: ${totalDeleted}`);
        console.log(`   Space freed: ${totalSize.toFixed(2)} MB`);

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

// دریافت آرگومان از command line
const withData = process.argv.includes('--with-data');
cleanAllMedia(withData);
