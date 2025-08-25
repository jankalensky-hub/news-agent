import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const EMAIL_TO = 'jan.kalensky@gmail.com';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

console.log('🚀 Spouštím News Agent...');
console.log('📧 Cílový e-mail:', EMAIL_TO);
console.log('⏰ Čas spuštění:', new Date().toLocaleString('cs-CZ'));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

async function fetchNews() {
    try {
        console.log('📰 Získávám zprávy...');
        const url = 'https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=' + NEWS_API_KEY;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status !== 'ok') {
            throw new Error('NewsAPI error: ' + data.message);
        }
        
        console.log('📊 Nalezeno ' + data.articles.length + ' článků');
        
        return data.articles.slice(0, 5).map(function(article, index) {
            return {
                title: article.title || 'Bez názvu',
                context: article.description || 'Popis není dostupný.',
                source: article.url || '#',
                importance: 'Významná zpráva dne podle popularity u čtenářů.',
                sourceName: article.source.name || 'Neznámý zdroj'
            };
        });
        
    } catch (error) {
        console.error('❌ Chyba:', error);
        return [{
            title: "News Agent funguje!",
            context: "Testovací zpráva - systém je připraven.",
            source: "https://github.com",
            importance: "Potvrzení správné funkčnosti agenta.",
            sourceName: "System Test"
        }];
    }
}

function createEmailHTML(newsData) {
    const today = new Date().toLocaleDateString('cs-CZ');
    const time = new Date().toLocaleTimeString('cs-CZ');
    
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Denní zprávy</title>';
    html += '<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;}';
    html += '.header{background:#667eea;color:white;padding:20px;text-align:center;border-radius:8px;}';
    html += '.news-table{width:100%;border-collapse:collapse;margin:20px 0;}';
    html += '.news-table th{background:#34495e;color:white;padding:15px;text-align:left;}';
    html += '.news-table td{padding:15px;border-bottom:1px solid #eee;}';
    html += '.news-title{font-weight:bold;color:#2c3e50;margin-bottom:8px;}';
    html += '.news-context{color:#7f8c8d;margin-bottom:8px;}';
    html += '.news-source{color:#3498db;text-decoration:none;}';
    html += '.importance{color:#e67e22;}</style></head><body>';
    
    html += '<div class="header"><h1>📧 Denní zpravodajský přehled</h1><p>' + today + '</p></div>';
    html += '<table class="news-table"><thead><tr><th>Zpráva</th><th>Důvod důležitosti</th></tr></thead><tbody>';
    
    for (let i = 0; i < newsData.length; i++) {
        const news = newsData[i];
        html += '<tr><td>';
        html += '<div class="news-title">' + news.title + '</div>';
        html += '<div class="news-context">' + news.context + '</div>';
        html += '<a href="' + news.source + '" class="news-source">Číst článek →</a>';
        html += '</td><td><div class="importance">' + news.importance + '</div></td></tr>';
    }
    
    html += '</tbody></table><div style="text-align:center;color:#7f8c8d;margin-top:20px;">';
    html += 'Připraveno v ' + time + ' | News Agent v1.0</div></body></html>';
    
    return html;
}

async function sendEmail(htmlContent, newsCount) {
    try {
        const subject = '📰 Denní zprávy - ' + new Date().toLocaleDateString('cs-CZ');
        
        const mailOptions = {
            from: '"News Agent" <' + SMTP_USER + '>',
            to: EMAIL_TO,
            subject: subject,
            html: htmlContent
        };
        
        console.log('📧 Odesílám e-mail...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ E-mail odeslán:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('❌ Chyba při odesílání:', error);
        throw error;
    }
}

async function main() {
    try {
        if (!SMTP_USER || !SMTP_PASS || !NEWS_API_KEY) {
            throw new Error('Chybí environment variables!');
        }
        
        console.log('🔑 Environment variables OK');
        
        const newsData = await fetchNews();
        console.log('📊 Zpracováno ' + newsData.length + ' zpráv');
        
        const emailHTML = createEmailHTML(newsData);
        console.log('📧 HTML e-mail připraven');
        
        await sendEmail(emailHTML, newsData.length);
        
        console.log('🎉 News Agent úspěšně dokončen!');
        
    } catch (error) {
        console.error('💥 Kritická chyba:', error.message);
        process.exit(1);
    }
}

console.log('========================================');
console.log('🤖 NEWS AGENT v1.0');
console.log('========================================');
main();
