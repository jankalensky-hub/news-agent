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
        console.log('📰 Získávám zprávy z mezinárodních zdrojů...');
        
        // Kvalitní mezinárodní zdroje
        const sources = [
            `https://newsapi.org/v2/top-headlines?sources=bbc-news&apiKey=${NEWS_API_KEY}`,
            `https://newsapi.org/v2/top-headlines?sources=reuters&apiKey=${NEWS_API_KEY}`,
            `https://newsapi.org/v2/top-headlines?sources=associated-press&apiKey=${NEWS_API_KEY}`,
            `https://newsapi.org/v2/everything?q=Czech+OR+Prague+OR+Czechia&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
            `https://newsapi.org/v2/top-headlines?country=gb&category=business&apiKey=${NEWS_API_KEY}`
        ];
        
        console.log('🔍 Stahuju ze ' + sources.length + ' zdrojů...');
        
        // Paralelní získání ze všech zdrojů
        const responses = await Promise.allSettled(
            sources.map(url => fetch(url).then(r => r.json()))
        );
        
        let allArticles = [];
        
        // Kombinace všech článků
        responses.forEach((response, index) => {
            if (response.status === 'fulfilled' && response.value.articles) {
                console.log(`📊 Zdroj ${index + 1}: ${response.value.articles.length} článků`);
                allArticles = allArticles.concat(response.value.articles);
            }
        });
        
        console.log(`📊 Celkem nalezeno: ${allArticles.length} článků`);
        
        // Filtrování a scoring
        const filteredNews = filterAndScoreNews(allArticles);
        
        console.log(`✅ Po filtraci: ${filteredNews.length} relevantních článků`);
        
        // Výběr top 5
        return filteredNews.slice(0, 5).map((article, index) => ({
            title: article.title || 'Bez názvu',
            context: article.description || 'Popis není dostupný.',
            source: article.url || '#',
            importance: generateSmartImportance(article, index + 1),
            publishedAt: article.publishedAt,
            sourceName: article.source.name || 'Neznámý zdroj',
            score: article.score
        }));
        
    } catch (error) {
        console.error('❌ Chyba při získávání zpráv:', error);
        return getFallbackNews();
    }
}

// Inteligentní filtrování a scoring
function filterAndScoreNews(articles) {
    // Blacklist - co NECHCEME
    const blacklist = [
        'sport', 'sports', 'football', 'basketball', 'baseball', 'golf', 'tennis',
        'celebrity', 'dies at', 'obituary', 'movie', 'film', 'entertainment',
        'kardashian', 'taylor swift', 'hollywood', 'netflix', 'disney'
    ];
    
    // Priority - co CHCEME (vyšší číslo = důležitější)
    const priorities = {
        // Nejvyšší priorita
        'czech': 10, 'prague': 10, 'czechia': 10, 'czech republic': 10,
        'war': 8, 'ukraine': 8, 'russia': 8, 'china': 8, 'nuclear': 8,
        'economy': 7, 'economic': 7, 'inflation': 7, 'market': 7, 'bank': 6,
        'climate': 6, 'global warming': 6, 'environment': 6,
        'technology': 5, 'ai': 5, 'artificial intelligence': 5, 'cyber': 5,
        'health': 5, 'pandemic': 5, 'vaccine': 5, 'medical': 5,
        'election': 5, 'government': 5, 'politics': 4, 'president': 4,
        'europe': 4, 'european union': 4, 'nato': 4, 'brexit': 4,
        // Střední priorita
        'energy': 3, 'oil': 3, 'gas': 3, 'trade': 3, 'immigration': 3
    };
    
    return articles
        .filter(article => {
            if (!article || !article.title) return false;
            
            const content = (article.title + ' ' + (article.description || '')).toLowerCase();
            
            // Vyfiltrovat blacklist
            if (blacklist.some(word => content.includes(word))) {
                return false;
            }
            
            // Musí mít nějakou prioritu nebo být z kvalitních zdrojů
            const hasImportantKeyword = Object.keys(priorities).some(keyword => 
                content.includes(keyword)
            );
            
            const isQualitySource = ['bbc', 'reuters', 'associated press', 'ap'].some(source =>
                (article.source?.name || '').toLowerCase().includes(source)
            );
            
            return hasImportantKeyword || isQualitySource;
        })
        .map(article => {
            // Vypočítat score
            const content = (article.title + ' ' + (article.description || '')).toLowerCase();
            let score = 0;
            
            // Body za klíčová slova
            Object.entries(priorities).forEach(([keyword, points]) => {
                if (content.includes(keyword)) {
                    score += points;
                }
            });
            
            // Extra body za kvalitní zdroje
            const sourceName = (article.source?.name || '').toLowerCase();
            if (sourceName.includes('bbc')) score += 3;
            if (sourceName.includes('reuters')) score += 3;
            if (sourceName.includes('associated press')) score += 3;
            
            // Body za čerstvost (posledních 24 hodin)
            const publishedAt = new Date(article.publishedAt);
            const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 24) score += 2;
            
            article.score = score;
            return article;
        })
        .sort((a, b) => b.score - a.score); // Seřadit podle score
}

// Inteligentní generování důležitosti
function generateSmartImportance(article, position) {
    const content = (article.title + ' ' + (article.description || '')).toLowerCase();
    
    // České zprávy
    if (content.includes('czech') || content.includes('prague') || content.includes('czechia')) {
        return `Přímý dopad na Českou republiku. ${position}. nejdůležitější zpráva pro české čtenáře.`;
    }
    
    // Válka a bezpečnost
    if (content.includes('war') || content.includes('ukraine') || content.includes('russia') || content.includes('nuclear')) {
        return `Bezpečnostní hrozba s dopadem na Evropu a NATO. Geopolitický význam pro ČR.`;
    }
    
    // Ekonomika
    if (content.includes('economy') || content.includes('inflation') || content.includes('market') || content.includes('bank')) {
        return `Ekonomický vývoj ovlivňující globální trhy. Možný dopad na českou ekonomiku.`;
    }
    
    // Klimatické změny
    if (content.includes('climate') || content.includes('global warming') || content.includes('environment')) {
        return `Klimatická krize s dlouhodobým dopadem na celý svět včetně České republiky.`;
    }
    
    // Technologie a AI
    if (content.includes('technology') || content.includes('ai') || content.includes('artificial intelligence')) {
        return `Technologický pokrok měnící budoucnost práce a společnosti. Trend s globálním dopadem.`;
    }
    
    // Zdraví
    if (content.includes('health') || content.includes('pandemic') || content.includes('vaccine') || content.includes('medical')) {
        return `Zdravotní téma s významem pro veřejné zdraví. Důležité pro informovanost občanů.`;
    }
    
    // Evropská unie
    if (content.includes('europe') || content.includes('european union') || content.includes('nato')) {
        return `Evropská záležitost s přímým dopadem na členské státy včetně České republiky.`;
    }
    
    // Default
    return `Významná mezinárodní zpráva podle důležitosti a dopadu. ${position}. nejrelevantnější téma dne.`;
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
