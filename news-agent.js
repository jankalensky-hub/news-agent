import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

// Konfigurace z environment variables
const EMAIL_TO = 'jan.kalensky@gmail.com';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

console.log('🚀 Spouštím News Agent...');
console.log('📧 Cílový e-mail:', EMAIL_TO);
console.log('⏰ Čas spuštění:', new Date().toLocaleString('cs-CZ'));

// SMTP transporter
const transporter = nodemailer.createTransport({
   host: 'smtp.gmail.com',
   port: 587,
   secure: false,
   auth: {
       user: SMTP_USER,
       pass: SMTP_PASS
   }
});

// Získání zpráv z NewsAPI
async function fetchNews() {
   try {
       console.log('📰 Získávám zprávy...');
       
       // Americké zprávy (vždy dostupné)
       const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${NEWS_API_KEY}`;
       const response = await fetch(url);
       const data = await response.json();
       
       if (data.status !== 'ok') {
           throw new Error('NewsAPI error: ' + data.message);
       }
       
       console.log(`📊 Nalezeno ${data.articles.length} článků`);
       
       // Výběr 5 nejlepších zpráv
       return data.articles.slice(0, 5).map((article, index) => ({
           title: article.title || 'Bez názvu',
           context: article.description || 'Popis není dostupný.',
           source: article.url || '#',
           importance: generateImportanceReason(article, index + 1),
           publishedAt: article.publishedAt,
           sourceName: article.source.name || 'Neznámý zdroj'
       }));
       
   } catch (error) {
       console.error('❌ Chyba při získávání zpráv:', error);
       // Fallback zprávy pokud API nefunguje
       return getFallbackNews();
   }
}

// Generování důvodu důležitosti
function generateImportanceReason(article, position) {
   const title = (article.title || '').toLowerCase();
   const description = (article.description || '').toLowerCase();
   const content = title + ' ' + description;
   
   // Klíčová slova pro kategorizaci
   const categories = {
       politics: ['government', 'president', 'congress', 'senate', 'election', 'law', 'policy'],
       economy: ['market', 'economy', 'stock', 'bank', 'investment', 'business', 'financial'],
       health: ['health', 'medical', 'hospital', 'disease', 'covid', 'vaccine', 'patient'],
       technology: ['technology', 'tech', 'ai', 'computer', 'digital', 'internet', 'software'],
       security: ['security', 'police', 'accident', 'fire', 'crisis', 'attack', 'emergency'],
       international: ['world', 'international', 'global', 'china', 'russia', 'ukraine', 'europe']
   };
   
   // Určení kategorie
   let category = 'general';
   for (const [cat, keywords] of Object.entries(categories)) {
       if (keywords.some(keyword => content.includes(keyword))) {
           category = cat;
           break;
       }
   }
   
   // Důvody podle kategorie
   const reasons = {
       politics: `Politické rozhodnutí s významem pro mezinárodní vztahy. ${position}. nejčtenější zpráva dne.`,
       economy: `Ekonomická zpráva s dopadem na globální trhy. Může ovlivnit světovou ekonomiku.`,
       health: `Zdravotní téma s významem pro veřejné zdraví. Důležité pro informovanost občanů.`,
       technology: `Technologický vývoj měnící způsob života a práce. Trend s dlouhodobým dopadem.`,
       security: `Bezpečnostní událost s mezinárodním významem. Informace pro občany.`,
       international: `Mezinárodní událost s geopolitickým významem. Může ovlivnit světové dění.`,
       general: `Významná zpráva dne podle popularity u čtenářů. ${position}. nejdiskutovanější téma.`
   };
   
   return reasons[category];
}

// Záložní zprávy pokud API nefunguje
function getFallbackNews() {
   const today = new Date().toLocaleDateString('cs-CZ');
   return [
       {
           title: "News Agent úspěšně spuštěn",
           context: `Váš automatický news agent funguje správně ke dni ${today}. Toto je testovací zpráva.`,
           source: "mailto:jan.kalensky@gmail.com",
           importance: "Potvrzení funkčnosti automatického systému pro denní zpravodajství.",
           sourceName: "News Agent System"
       },
       {
           title: "API služba dočasně nedostupná",
           context: "NewsAPI služba není momentálně dostupná. Zkuste znovu spustit později.",
           source: "https://newsapi.org/docs",
           importance: "Technická informace o dostupnosti služeb pro správný chod systému.",
           sourceName: "Technical Status"
       }
   ];
}

// Vytvoření HTML e-mailu
function createEmailHTML(newsData) {
   const today = new Date().toLocaleDateString('cs-CZ', {
       weekday: 'long',
       year: 'numeric',
       month: 'long',
       day: 'numeric'
   });
   const time = new Date().toLocaleTimeString('cs-CZ');
   
   let html = `
       <!DOCTYPE html>
       <html>
       <head>
           <meta charset="UTF-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           <title>Denní zprávy - ${today}</title>
           <style>
               body { 
                   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                   max-width: 800px; 
                   margin: 0 auto; 
                   padding: 20px; 
                   background: #f5f5f5;
                   color: #333;
               }
               .container {
                   background: white;
                   border-radius: 12px;
                   overflow: hidden;
                   box-shadow: 0 4px 12px rgba(0,0,0,0.1);
               }
               .header { 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; 
                   padding: 30px; 
                   text-align: center; 
               }
               .header h1 { margin: 0; font-size: 2.2em; font-weight: 300; }
               .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
               .news-table { 
                   width: 100%; 
                   border-collapse: collapse; 
                   margin: 0;
               }
               .news-table th { 
                   background: #34495e; 
                   color: white; 
                   padding: 18px; 
                   text-align: left; 
                   font-weight: 600;
                   font-size: 1.1em;
               }
               .news-table td { 
                   padding: 20px 18px; 
                   border-bottom: 1px solid #eee; 
                   vertical-align: top; 
               }
               .news-table tr:last-child td { border-bottom: none; }
               .news-table tr:nth-child(even) { background: #fafafa; }
               .news-title { 
                   font-weight: 600; 
                   color: #2c3e50; 
                   margin-bottom: 10px; 
                   font-size: 1.1em;
                   line-height: 1.3;
               }
               .news-context { 
                   color: #555; 
                   margin-bottom: 12px; 
                   line-height: 1.5; 
               }
               .news-meta {
                   display: flex;
                   justify-content: space-between;
                   align-items: center;
                   margin-top: 8px;
               }
               .news-source { 
                   color: #3498db; 
                   text-decoration: none; 
                   font-size: 0.9em;
                   font-weight: 500;
               }
               .news-source:hover { text-decoration: underline; }
               .source-name {
                   color: #7f8c8d;
                   font-size: 0.85em;
                   font-style: italic;
               }
               .importance { 
                   color: #e67e22; 
                   font-weight: 500; 
                   line-height: 1.5; 
               }
               .footer { 
                   text-align: center; 
                   color: #7f8c8d; 
                   padding: 25px;
                   background: #f8f9fa;
                   font-size: 0.9em; 
               }
               .footer strong { color: #2c3e50; }
               @media (max-width: 600px) {
                   .news-table, .news-table tbody, .news-table tr, .news-table td {
                       display: block;
                       width: 100%;
                   }
                   .news-table th { display: none; }
                   .news-table td {
                       padding: 15px;
                       margin-bottom: 20px;
                       border: 1px solid #ddd;
                       border-radius: 8px;
                   }
               }
           </style>
       </head>
       <body>
           <div class="container">
               <div class="header">
                   <h1>📧 Denní zpravodajský přehled</h1>
                   <p>${today}</p>
               </div>
               
               <table class="news-table">
                   <thead>
                       <tr>
                           <th style="width: 60%;">Zpráva</th>
                           <th style="width: 40%;">Důvod důležitosti</th>
                       </tr>
                   </thead>
                   <tbody>
   `;
   
   // Iterace přes zprávy
   newsData.forEach((news, index) => {
       html += `
           <tr>
               <td>
                   <div class="news-title">${news.title}</div>
                   <div class="news-context">${news.context}</div>
                   <div class="news-meta">
                       <a href="${news.source}" class="news-source" target="_blank">Číst článek →</a>
                       <span class="source-name">${news.sourceName}</span>
                   </div>
               </td>
               <td>
                   <div class="importance">${news.importance}</div>
               </td>
           </tr>
       `;
   });
   
   html += `
                   </tbody>
               </table>
               
               <div class="footer">
                   <strong>📊 Statistiky:</strong> ${newsData.length} zpráv ze ${[...new Set(newsData.map(n => n.sourceName))].length} zdrojů<br>
                   <strong>⏰ Připraveno:</strong> ${time} | <strong>🤖 News Agent</strong> v1.0
               </div>
           </div>
       </body>
       </html>
   `;
   
   return html;
}

// Odeslání e-mailu
async function sendEmail(htmlContent, newsCount) {
   try {
       const subject = `📰 Denní zprávy (${newsCount} zpráv) - ${new Date().toLocaleDateString('cs-CZ')}`;
       
       const mailOptions = {
           from: `"News Agent" <${SMTP_USER}>`,
           to: EMAIL_TO,
           subject: subject,
           html: htmlContent,
           text: `Denní zpravodajský přehled - ${new Date().toLocaleDateString('cs-CZ')}. Pro správné zobrazení otevřete e-mail v HTML prohlížeči.`
       };
       
       console.log('📧 Odesílám e-mail...');
       const info = await transporter.sendMail(mailOptions);
       console.log('✅ E-mail úspěšně odeslán:', info.messageId);
       
       return true;
   } catch (error) {
       console.error('❌ Chyba při odesílání e-mailu:', error);
       throw error;
   }
}

// Hlavní funkce
async function main() {
   try {
       // Kontrola environment variables
       if (!SMTP_USER || !SMTP_PASS || !NEWS_API_KEY) {
           throw new Error('Chybí environment variables! Zkontrolujte SMTP_USER, SMTP_PASS a NEWS_API_KEY');
       }
       
       console.log('🔑 Environment variables OK');
       
       // Získání zpráv
       const newsData = await fetchNews();
       console.log(`📊 Zpracováno ${newsData.length} zpráv`);
       
       // Vytvoření e-mailu
       const emailHTML = createEmailHTML(newsData);
       console.log('📧 HTML e-mail připraven');
       
       // Odeslání
       await sendEmail(emailHTML, newsData.length);
       
       console.log('🎉 News Agent úspěšně dokončen!');
       console.log('📈 Statistiky:');
       console.log(`   - Zpráv: ${newsData.length}`);
       console.log(`   - Zdrojů: ${[...new Set(newsData.map(n => n.sourceName))].length}`);
       console.log(`   - Cíl: ${EMAIL_TO}`);
       
   } catch (error) {
       console.error('💥 Kritická chyba:', error.message);
       process.exit(1);
   }
}

// Spuštění
console.log('========================================');
console.log('🤖 NEWS AGENT v1.0');
console.log('========================================');
main();        security: `Bezpečnostní událost s dopadem na veřejný pořádek. Informace pro občany.`,
        international: `Mezinárodní událost s možným dopadem na Českou republiku. Geopolitický význam.`,
        general: `Významná zpráva dne podle popularity u čtenářů. ${position}. nejdiskutovanější téma.`
    };
    
    return reasons[category];
}

// Záložní zprávy pokud API nefunguje
function getFallbackNews() {
    const today = new Date().toLocaleDateString('cs-CZ');
    return [
        {
            title: "News Agent úspěšně spuštěn",
            context: `Váš automatický news agent funguje správně ke dni ${today}. Toto je testovací zpráva.`,
            source: "mailto:jan.kalensky@gmail.com",
            importance: "Potvrzení funkčnosti automatického systému pro denní zpravodajství.",
            sourceName: "News Agent System"
        },
        {
            title: "API služba dočasně nedostupná",
            context: "NewsAPI služba není momentálně dostupná. Zkuste znovu spustit později.",
            source: "https://newsapi.org/docs",
            importance: "Technická informace o dostupnosti služeb pro správný chod systému.",
            sourceName: "Technical Status"
        }
    ];
}

// Vytvoření HTML e-mailu
function createEmailHTML(newsData) {
    const today = new Date().toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const time = new Date().toLocaleTimeString('cs-CZ');
    
    let html = `
        
        
        
            
            
            Denní zprávy - ${today}
            
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background: #f5f5f5;
                    color: #333;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .header h1 { margin: 0; font-size: 2.2em; font-weight: 300; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
                .news-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 0;
                }
                .news-table th { 
                    background: #34495e; 
                    color: white; 
                    padding: 18px; 
                    text-align: left; 
                    font-weight: 600;
                    font-size: 1.1em;
                }
                .news-table td { 
                    padding: 20px 18px; 
                    border-bottom: 1px solid #eee; 
                    vertical-align: top; 
                }
                .news-table tr:last-child td { border-bottom: none; }
                .news-table tr:nth-child(even) { background: #fafafa; }
                .news-title { 
                    font-weight: 600; 
                    color: #2c3e50; 
                    margin-bottom: 10px; 
                    font-size: 1.1em;
                    line-height: 1.3;
                }
                .news-context { 
                    color: #555; 
                    margin-bottom: 12px; 
                    line-height: 1.5; 
                }
                .news-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 8px;
                }
                .news-source { 
                    color: #3498db; 
                    text-decoration: none; 
                    font-size: 0.9em;
                    font-weight: 500;
                }
                .news-source:hover { text-decoration: underline; }
                .source-name {
                    color: #7f8c8d;
                    font-size: 0.85em;
                    font-style: italic;
                }
                .importance { 
                    color: #e67e22; 
                    font-weight: 500; 
                    line-height: 1.5; 
                }
                .footer { 
                    text-align: center; 
                    color: #7f8c8d; 
                    padding: 25px;
                    background: #f8f9fa;
                    font-size: 0.9em; 
                }
                .footer strong { color: #2c3e50; }
                @media (max-width: 600px) {
                    .news-table, .news-table tbody, .news-table tr, .news-table td {
                        display: block;
                        width: 100%;
                    }
                    .news-table th { display: none; }
                    .news-table td {
                        padding: 15px;
                        margin-bottom: 20px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                    }
                }
            
        
        
            
                
                    📧 Denní zpravodajský přehled
                    ${today}
                
                
                
    `;
    
    newsData.forEach((news, index) => {
        html += `
            
        `;
    });
    
    html += `
                    
                    
                        
                            Zpráva
                            Důvod důležitosti
                        
                    
                    
                
                    ${news.title}
                    ${news.context}
                    
                        Číst článek →
                        ${news.sourceName}
                    
                
                
                    ${news.importance}
                
            
                
                
                
                    📊 Statistiky: ${newsData.length} zpráv ze ${[...new Set(newsData.map(n => n.sourceName))].length} zdrojů
                    ⏰ Připraveno: ${time} | 🤖 News Agent v1.0
                
            
        
        
    `;
    
    return html;
}

// Odeslání e-mailu
async function sendEmail(htmlContent, newsCount) {
    try {
        const subject = `📰 Denní zprávy (${newsCount} zpráv) - ${new Date().toLocaleDateString('cs-CZ')}`;
        
        const mailOptions = {
            from: `"News Agent" <${SMTP_USER}>`,
            to: EMAIL_TO,
            subject: subject,
            html: htmlContent,
            text: `Denní zpravodajský přehled - ${new Date().toLocaleDateString('cs-CZ')}. Pro správné zobrazení otevřete e-mail v HTML prohlížeči.`
        };
        
        console.log('📧 Odesílám e-mail...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ E-mail úspěšně odeslán:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('❌ Chyba při odesílání e-mailu:', error);
        throw error;
    }
}

// Hlavní funkce
async function main() {
    try {
        // Kontrola environment variables
        if (!SMTP_USER || !SMTP_PASS || !NEWS_API_KEY) {
            throw new Error('Chybí environment variables! Zkontrolujte SMTP_USER, SMTP_PASS a NEWS_API_KEY');
        }
        
        console.log('🔑 Environment variables OK');
        
        // Získání zpráv
        const newsData = await fetchCzechNews();
        console.log(`📊 Zpracováno ${newsData.length} zpráv`);
        
        // Vytvoření e-mailu
        const emailHTML = createEmailHTML(newsData);
        console.log('📧 HTML e-mail připraven');
        
        // Odeslání
        await sendEmail(emailHTML, newsData.length);
        
        console.log('🎉 News Agent úspěšně dokončen!');
        console.log('📈 Statistiky:');
        console.log(`   - Zpráv: ${newsData.length}`);
        console.log(`   - Zdrojů: ${[...new Set(newsData.map(n => n.sourceName))].length}`);
        console.log(`   - Cíl: ${EMAIL_TO}`);
        
    } catch (error) {
        console.error('💥 Kritická chyba:', error.message);
        process.exit(1);
    }
}

// Spuštění
console.log('========================================');
console.log('🤖 NEWS AGENT v1.0');
console.log('========================================');
main();
