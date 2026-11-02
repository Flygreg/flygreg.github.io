// Sdílené rozpoznávání nabídek: používá web (index.html) i Hlídač (Apps Script).
// Žádná závislost na prohlížeči (DOM). Změnami tady se mění výsledek na obou místech.
const Z_TITLE=/zájezd|all[\s-]?inclusive|polopenz|snídan|hotel|resort|ubytov|pobyt|apartm|wellness|\d\*|týden v|noc[íi](?![\p{L}])|nights?\b|buy\s*&\s*fly|dovolen|holiday|p\.\s?p\./iu,Z_TEXT=/zájezd|all[\s-]?inclusive|polopenz|resort/i;const kindOf=x=>(Z_TITLE.test(x.title)||Z_TEXT.test(x.summary||''))?'zajezd':'letenka';
// země -> města (regulární výraz zachytí české i anglické tvary); města bez nabídek se skryjí, kromě PIN
const ORI=[['CZ','Česko',[['Praha','Prah(?:y|a)|Prague|PRG'],['Ostrava','Ostrav(?:y|a)'],['Brno','Brn(?:a|o)'],['Pardubice','Pardubic(?:e)?']]],
['SK','Slovensko',[['Bratislava','Bratislav(?:y|a)']]],
['AT','Rakousko',[['Vídeň','Vídn(?:ě|e)|Vídeň|Vienna'],['Salcburk','Salcburk(?:u)?|Salzburg'],['Linz','Linz|Lince']]],
['DE','Německo',[['Berlín','Berlín(?:a)?|Berlin'],['Norimberk','Norimberk(?:u)?|Nuremberg|Nürnberg'],['Mnichov','Mnichov(?:a)?|Munich|München'],['Drážďany','Drážďan(?:y)?|Dresden'],['Lipsko','Lipsk(?:a|o)|Leipzig'],['Frankfurt','Frankfurt(?:u)?'],['Hamburk','Hamburk(?:u)?|Hamburg'],['Düsseldorf','Düsseldorf(?:u)?|Dusseldorf'],['Memmingen','Memmingen(?:u)?'],['Kolín n. R.','Kolín nad Rýnem|Cologne|Köln'],['Stuttgart','Stuttgart(?:u)?']]],
['PL','Polsko',[['Krakov','Krakov(?:a)?|Krakow|Kraków'],['Katovice','Katovic(?:e)?|Katowice'],['Vratislav','Vratislav(?:i)?|Wroclaw|Wrocław'],['Varšava','Varšav(?:y|a)|Warsaw']]]];
const PIN=new Set(['Praha','Vídeň','Berlín','Norimberk','Mnichov']),SHOW0=new Set(['CZ','AT','DE']),CITY2CC={},RX={};
const RXC={},CALL='(?:'+ORI.flatMap(o=>o[2].map(c=>c[1])).join('|')+')',SEP='(?:\\s*[,/&]\\s*|\\s+(?:a|i|nebo|or|and)\\s+(?:(?:z|ze|from)\\s+)?)',LISTRX=new RegExp('(?<![\\p{L}])(?:z|ze|od|from)\\s+('+CALL+'(?:'+SEP+CALL+')*)(?![\\p{L}])','giu');ORI.forEach(([cc,,cs])=>cs.forEach(([c,rx])=>{RXC[c]=new RegExp('(?<![\\p{L}])(?:'+rx+')(?![\\p{L}])','iu')}));const fromList=t=>{const r=new Set();for(const m of String(t||'').matchAll(LISTRX))for(const c in RXC)if(RXC[c].test(m[1]))r.add(c);return[...r]};
ORI.forEach(([cc,,cs])=>cs.forEach(([c,rx])=>{CITY2CC[c]=cc;RX[c]=new RegExp('(?<![\\p{L}])(?:z|ze|od|from)\\s+(?:'+rx+')(?![\\p{L}])|(?:^|:\\s|\\s)(?:'+rx+')\\s*[-–—]\\s*(?![\\d\\s])','iu')}));
const originsOf=x=>{const f=t=>{const r=[];for(const c in RX)if(RX[c].test(t))r.push(c);return r};const r=new Set([...f(x.title),...fromList(x.title),...fromList(x.summary)]);if(!r.size)f(x.summary||'').slice(0,1).forEach(c=>r.add(c));return[...r]};
const EXT=new RegExp('(?<![\\p{L}])(?:z|ze|od|from)\\s+(?:Budapešt(?:i|ě)|Budapest|Kodaň(?:i|e)?|Kodan(?:i|ě)|Copenhagen|Amsterdam(?:u)?|Brusel(?:u)?|Brussels|Pa(?:ř|r)íž(?:i)?|Paris|Londýn(?:a|ě)?|London|Bukure(?:š|s)t(?:i|ě)?|Bucharest|Mil(?:á|a)n(?:a|o)?|Milan|Dublin(?:u)?|Stockholm(?:u)?|Manchester(?:u)?|Řím(?:a|ě)?|Rome|Madrid(?:u)?|Barcelon(?:y|a)|Lisabon(?:u)?|Lisbon|Atén(?:y|ách)?|Athens|Sofi(?:e|i)|Sofia|Bělehrad(?:u)?|Belgrade|Zagreb(?:u)?|Vilnius|Riga|Riga|Helsink(?:y|i)|Oslo)(?![\\p{L}])','iu');const CRX=[['CZ',/(?<![\p{L}])(?:from|z|ze)\s+(?:Czechia|Czech Republic|Česka|Česk[ée] republiky)(?![\p{L}])/iu],['SK',/(?<![\p{L}])(?:from|z|ze)\s+(?:Slovakia|Slovensk[ao]|Slovenska)(?![\p{L}])/iu],['AT',/(?<![\p{L}])(?:from|z|ze)\s+(?:Austria|Rakousk[ao])(?![\p{L}])/iu],['DE',/(?<![\p{L}])(?:from|z|ze)\s+(?:Germany|Německ[ao])(?![\p{L}])/iu],['PL',/(?<![\p{L}])(?:from|z|ze)\s+(?:Poland|Polsk[ao])(?![\p{L}])/iu]];const isEng=x=>!/[ěščřžýáíéúůďťňó]/i.test(x.title)&&/(?<![\p{L}])(?:from|flights?|hotel|stay|holiday|for|the|and)(?![\p{L}])/iu.test(x.title);const hotelOnly=x=>isEng(x)&&/hotel|\/double|stay at|ubytov/i.test(x.title)&&!/flight|fly|\blet|letenk|odlet|airways|airlines|zájezd|all[\s-]?inclusive|dovolen/i.test(x.title);

// Zobrazovaný název nabídky (zjednodušení názvů, odebrání částek z textu)
const AIRL=['Azerbaijan Airlines','Aer Lingus','Etihad Airways','Turkish Airlines','Hainan Airlines','China Eastern Airlines','Polish Airlines','Pegasus Airlines','United Airlines','Wizz Air','Ryanair','Condor','Buzz','Lauda','Eurowings','Lufthansa','Austrian Airlines','Emirates','Qatar Airways','KLM','Air France','easyJet','Transavia','Vueling','Norwegian','Jet2','Finnair','Singapore Airlines','Cathay Pacific','Air India','Vietnam Airlines','Thai Airways','Saudia','Oman Air','Gulf Air','Royal Jordanian','Ethiopian Airlines','EgyptAir','Air Canada','Air Arabia','flydubai','Smartwings','Air Serbia','Aegean','ITA Airways','Korean Air','Qantas'],CZW={Paris:'Paříž',Brussels:'Brusel',London:'Londýn',Warsaw:'Varšava',Vienna:'Vídeň',Prague:'Praha',Milan:'Milán',Rome:'Řím',Copenhagen:'Kodaň',Budapest:'Budapešť',Munich:'Mnichov',Berlin:'Berlín',Lisbon:'Lisabon',Athens:'Atény',Bucharest:'Bukurešť',Germany:'Německo',Poland:'Polsko',Italy:'Itálie',Spain:'Španělsko',France:'Francie',Scandinavia:'Skandinávie',Hamburg:'Hamburk',Krakow:'Krakov',Katowice:'Katovice',Wroclaw:'Vratislav',Dresden:'Drážďany',Cologne:'Kolín n. R.',Nuremberg:'Norimberk',Leipzig:'Lipsko'};
const stripE=t=>t.replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu,'').replace(/\s+/g,' ').trim(),cz=t=>t.replace(/^the\s+/i,'').replace(/many European cities/i,'evropská města').replace(/\bUK\b/,'Británie').replace(/\b[A-Z][A-Za-z]+\b/g,w=>CZW[w]||w);
const fmtK=n=>Number(n).toLocaleString('cs-CZ');
function priceStr(x){return x.price?fmtK(x.price)+' Kč':x._czk?'≈ '+fmtK(x._czk)+' Kč':''}
function niceTitle(x){const t=x.title;let m=t.match(/^([^:]{2,30}):\s*(.+?)\s+-\s+(.+?)\s+-\s+[\d\s ]+Kč$/);if(m)return m[1]+': '+m[2]+' – '+m[3];
if(!/[ěščřžýáíéúůďťňó]/i.test(t)&&/\b(?:flights?|fares)\s+from\b/i.test(t)){const c=stripE(t).replace(/\s+(?:one-way|return|round trip)$/i,'').replace(/\s+(?:for|from)\s+[€£$]?\d.*$/i,'');m=c.match(/(?:flights?|fares)\s+from\s+(.+?)\s+to\s+(.+)$/i);if(m){const a=AIRL.find(a=>new RegExp('(?<![\\w])'+a+'(?![\\w])','i').test(t));return(a?a+': ':'')+cz(m[1].replace(/\s*\bor\b\s*/i,' / '))+' – '+cz(m[2])}}
m=stripE(t).match(/^(?:Akční letenky:\s*)?([^–|:,]+?)(?:,\s*[^–|]+?)?\s*[–|]\s*(?:akční\s+)?letenky\s+z\s+\S+/i);if(m&&x._o&&x._o.length)return x._o[0]+' – '+m[1].trim();return null}
const NUMR='(?:\\d{1,3}(?:[\\s\\u00a0.]\\d{3})+|\\d{3,6})(?:,-)?';function stripPrice(t){let s=t.replace(new RegExp('[.:]?\\s+(?:Letenky|Zájezdy?)\\s+od\\s+'+NUMR+'\\s?Kč\\.?$','i'),'.').replace(new RegExp('\\.\\s+Od\\s+'+NUMR+'\\s?Kč\\.?$','i'),'').replace(new RegExp('\\s+(?:už\\s+)?(?:za|od)\\s+'+NUMR+'\\s?Kč','gi'),'').replace(new RegExp('\\s+'+NUMR+'\\s?Kč','gi'),'').replace(/\s+(?:for|from)\s+[€£$]\s?\d[\d,]*(?:\s?p\.p\.|\/double)?/gi,'').replace(/\s*[-–]\s*$/,'').replace(/\s+([.,:])/g,'$1').replace(/\s{2,}/g,' ').trim();return s.length>=4?s:t}
function shownTitle(x){return niceTitle(x)||stripPrice(x.title)}

// Doplní nabídce odvozené údaje: typ (_k), cenu v Kč (_czk), odlety (_o), země (_c), "cizí odlet" (_ext)
function classifyItem(x,RATES){x._k=kindOf(x);{const po=x.priceOrig,rt=RATES&&po&&RATES.rates&&RATES.rates[po.cur];x._czk=(!x.price&&rt)?Math.round(po.amount*rt/10)*10:0;x._rt=rt||0}x._o=originsOf(x);x._ext=!x._o.length&&EXT.test(x.title);x._c=new Set(x._o.map(c=>CITY2CC[c]));CRX.forEach(([cc,r])=>{if(r.test(x.title))x._c.add(cc)});if(!x._c.size&&(isEng(x)||hotelOnly(x)))x._ext=true;return x}
// Cena nabídky v Kč (0 = neznámá)
const priceCzk=x=>x.price?Number(x.price):(x._czk||0);

// ---------- zeměpisné hledání cílů (Hlídač i hledání na webu) ----------
// Strom: světadíl > země > oblast > město. Hledané slovo (Kanáry, Sicílie, Toskánsko, Itálie, Juventus…) najde i nabídky,
// které zmiňují některé místo uvnitř (Tenerife, Palermo, Florencii…). Tvary slov se skloňují (Sicílie, Sicílii, sicilský).
const GEO_SRC=`#Evropa|evrop,europe
Španělsko|spanels,spain|ES
Kanárské ostrovy|kanary,kanarsk,canary,canarias,canaries|>Španělsko
Tenerife|tenerif,teneriffa,los cristianos,costa adeje,playa de las americas,puerto de la cruz|>Kanárské ostrovy
Gran Canaria|gran canari,grancanari,las palmas,maspalomas,playa del ingles|>Kanárské ostrovy
Lanzarote|lanzarot,arrecife,puerto del carmen|>Kanárské ostrovy
Fuerteventura|fuerteventur,corralejo,costa calma|>Kanárské ostrovy
La Palma|la palma|>Kanárské ostrovy
La Gomera|gomer|>Kanárské ostrovy
Baleáry|balear,balearic,baleary|>Španělsko
Mallorca|mallorc,majork,palma de mallorca|>Baleáry
Ibiza|ibiz,eivissa|>Baleáry
Menorca|menork,minorc|>Baleáry
Formentera|formenter|>Baleáry
Katalánsko|katalansk,catalon,catalunya|>Španělsko
Barcelona|barcelon|>Katalánsko
Girona|giron,costa brava|>Katalánsko
Tarragona|tarragon,salou,costa dorada,reus|>Katalánsko
Andalusie|andalusi,andalusk,andalusia|>Španělsko
Malaga|malag,costa del sol,marbella,torremolinos,benalmadena,fuengirola|>Andalusie
Sevilla|sevill,seville|>Andalusie
Granada|granad|>Andalusie
Almería|almeri|>Andalusie
Cádiz|cadiz,jerez,costa de la luz|>Andalusie
Valencijsko|valencijsk,valencian,costa blanca|>Španělsko
Valencie|valenci,valencia|>Valencijsko
Alicante|alicant,benidorm,torrevieja|>Valencijsko
Madrid|madrid|>Španělsko
Baskicko|baskick,basque|>Španělsko
Bilbao|bilba|>Baskicko
San Sebastián|san sebastian|>Baskicko
Galicie|galici,galicia|>Španělsko
Santiago de Compostela|santiago de compostela,vigo|>Galicie
Zaragoza|zaragoz,saragoss|>Španělsko
Itálie|itali,italsk,italy|IT
Sicílie|sicili,sicilsk,sicily|>Itálie
Palermo|palerm|>Sicílie
Katánie|katani,catania,etna|>Sicílie
Taormina|taormin|>Sicílie
Syrakusy|syrakus,siracus,syracus|>Sicílie
Trapani|trapan|>Sicílie
Agrigento|agrigent|>Sicílie
Messina|messin|>Sicílie
Lipary|lipar,aeolian,eolsk|>Sicílie
Sardinie|sardini,sardinsk,sardinia|>Itálie
Cagliari|cagliar|>Sardinie
Olbia|olbi|>Sardinie
Alghero|alghero|>Sardinie
Toskánsko|toskansk,toskan,tuscany|>Itálie
Florencie|florenc,florence,firenze|>Toskánsko
Pisa|pisa|>Toskánsko
Siena|siena|>Toskánsko
Lucca|lucca|>Toskánsko
Livorno|livorn|>Toskánsko
Kalábrie|kalabri,calabri|>Itálie
Lamezia Terme|lamezia|>Kalábrie
Reggio Calabria|reggio|>Kalábrie
Tropea|tropea|>Kalábrie
Apulie|apuli,puglia|>Itálie
Bari|bari|>Apulie
Brindisi|brindis|>Apulie
Lecce|lecce|>Apulie
Taranto|taranto|>Apulie
Lombardie|lombardi|>Itálie
Milán|milan,milano,malpensa,linate,inter milan,ac milan|>Lombardie
Bergamo|bergam,orio al serio|>Lombardie
Benátsko|benatsk,veneto|>Itálie
Benátky|benatk,venezi,venice,mestre|>Benátsko
Verona|veron|>Benátsko
Treviso|trevis|>Benátsko
Padova|padov,padua|>Benátsko
Lago di Garda|garda,gardsk|>Benátsko
Kampánie|kampani,campani|>Itálie
Neapol|neapol,napoli,naples,ssc napoli|>Kampánie
Amalfi|amalfi|>Kampánie
Capri|capri|>Kampánie
Sorrento|sorrent|>Kampánie
Pompeje|pompej,pompei|>Kampánie
Salerno|salern|>Kampánie
Řím|rim,roma!,rome,fiumicino,ciampino|>Itálie
Piemont|piemont|>Itálie
Turín|turin,torino,juventus,juve|>Piemont
Emilia-Romagna|emili,romagn|>Itálie
Bologna|bologn|>Emilia-Romagna
Rimini|rimin|>Emilia-Romagna
Parma|parma|>Emilia-Romagna
Ligurie|liguri|>Itálie
Janov|janov,genova,genoa|>Ligurie
Cinque Terre|cinque terre|>Ligurie
Furlansko|furlansk,friuli|>Itálie
Terst|terst,trieste|>Furlansko
Dolomity|dolomit,jizni tyrolsk,alto adige|>Itálie
Řecko|recko,recky,greece,greek|GR
Kréta|kret,kretsk,crete|>Řecko
Heraklion|heraklion,iraklion|>Kréta
Chania|chani,hania|>Kréta
Rethymno|rethymn|>Kréta
Rhodos|rhod,rodos,rhodes|>Řecko
Korfu|korf,corfu,kerkyra|>Řecko
Zakynthos|zakynth,zante|>Řecko
Kefalonie|kefalon,cephalon|>Řecko
Santorini|santorin,thira|>Řecko
Mykonos|mykon|>Řecko
Kos|kos|>Řecko
Lefkada|lefkad|>Řecko
Skiathos|skiath|>Řecko
Thassos|thass|>Řecko
Lesbos|lesb,lesvos|>Řecko
Atény|ateny,athen,athens|>Řecko
Soluň|solun,thessaloniki,saloniki|>Řecko
Chalkidiki|chalkidik,halkidik|>Řecko
Portugalsko|portugal,portugalsk|PT
Lisabon|lisabon,lisbon,lisboa|>Portugalsko
Porto|porto|>Portugalsko
Algarve|algarv,faro,albufeira|>Portugalsko
Madeira|madeir,funchal|>Portugalsko
Azory|azor,azores,ponta delgada|>Portugalsko
Francie|franci,france,francouzsk|FR
Paříž|pariz,paris|>Francie
Nice|nice,azurove pobrezi,cote d azur,french riviera,cannes|>Francie
Marseille|marseil,marsej|>Francie
Lyon|lyon|>Francie
Bordeaux|bordeaux|>Francie
Toulouse|toulous|>Francie
Korsika|korsik,corsic,ajaccio,bastia|>Francie
Provence|provenc|>Francie
Normandie|normand|>Francie
Štrasburk|strasbur,strassbourg|>Francie
Chorvatsko|chorvat,croati|HR
Split|split|>Chorvatsko
Dubrovník|dubrovnik|>Chorvatsko
Zadar|zadar|>Chorvatsko
Pula|pula|>Chorvatsko
Istrie|istri,istria|>Chorvatsko
Hvar|hvar|>Chorvatsko
Záhřeb|zahreb,zagreb|>Chorvatsko
Makarská riviéra|makarsk|>Chorvatsko
Turecko|turecko,turecka,turecku,turkey,turkiye|TR
Istanbul|istanbul,istambul|>Turecko
Antalya|antaly,antalij,kemer,belek|>Turecko
Bodrum|bodrum|>Turecko
Alanya|alany|>Turecko
Marmaris|marmaris|>Turecko
Dalaman|dalaman,fethiye|>Turecko
Izmir|izmir,kusadasi,didim|>Turecko
Kapadokie|kapadoki,cappadoc|>Turecko
Kypr|kypr,cypr,cyprus|CY
Larnaka|larnak|>Kypr
Paphos|paph,pafos|>Kypr
Limassol|limassol|>Kypr
Malta|malt|MT
Bulharsko|bulhar,bulgar|BG
Burgas|burgas|>Bulharsko
Varna|varna|>Bulharsko
Sofie|sofie,sofia|>Bulharsko
Slunečné pobřeží|slunecne pobrezi,sunny beach,nesebar|>Bulharsko
Velká Británie|britani,velka britani,spojene kralovstvi,united kingdom,great britain,anglie,england,anglick|GB
Londýn|londyn,london,heathrow,stansted,luton,gatwick,arsenal,chelsea,tottenham|>Velká Británie
Skotsko|skotsk,scotland|>Velká Británie
Edinburgh|edinburgh,edinburk|>Skotsko
Glasgow|glasgow|>Skotsko
Manchester|manchester,manchester united|>Velká Británie
Liverpool|liverpool|>Velká Británie
Birmingham|birmingham|>Velká Británie
Bristol|bristol|>Velká Británie
Belfast|belfast|>Velká Británie
Cardiff|cardiff|>Velká Británie
Irsko|irsk,ireland|IE
Dublin|dublin|>Irsko
Cork|cork,shannon|>Irsko
Německo|nemeck,nemec,german|DE
Berlín|berlin|>Německo
Mnichov|mnichov,munich,munchen,bayern|>Německo
Frankfurt|frankfurt|>Německo
Hamburk|hamburk,hamburg|>Německo
Drážďany|drazdan,dresden|>Německo
Norimberk|norimberk,nuremberg,nurnberg|>Německo
Lipsko|lipsk,leipzig|>Německo
Stuttgart|stuttgart|>Německo
Düsseldorf|dusseldorf|>Německo
Kolín nad Rýnem|kolin nad rynem,cologne,koln|>Německo
Memmingen|memmingen|>Německo
Rakousko|rakous,austria|AT
Vídeň|viden,vienna,wien|>Rakousko
Salcburk|salcburk,salzburg|>Rakousko
Innsbruck|innsbruck|>Rakousko
Štýrský Hradec|graz,styrsk hradec|>Rakousko
Linec|linz,linec|>Rakousko
Tyrolsko|tyrolsk,tyrol|>Rakousko
Polsko|polsk,poland|PL
Varšava|varsav,warsaw|>Polsko
Krakov|krakov,krakow,cracow|>Polsko
Gdaňsk|gdansk|>Polsko
Vratislav|vratislav,wroclaw|>Polsko
Poznaň|poznan|>Polsko
Katovice|katovic,katowice|>Polsko
Maďarsko|madar,hungary|HU
Budapešť|budapest,budapes|>Maďarsko
Slovensko|slovensk,slovak|SK
Bratislava|bratislav|>Slovensko
Košice|kosic,kosice|>Slovensko
Tatry|tatr,tatry|>Slovensko
Rumunsko|rumun,romania|RO
Bukurešť|bukurest,bucharest|>Rumunsko
Albánie|alban,albania|AL
Tirana|tiran|>Albánie
Černá Hora|cerna hor,montenegro|ME
Srbsko|srb,serbia|RS
Bělehrad|belehrad,belgrade|>Srbsko
Bosna a Hercegovina|bosn,bosnia,sarajev|BA
Slovinsko|slovin,slovenia|SI
Lublaň|lublan,ljubljan|>Slovinsko
Severní Makedonie|makedoni,skopje|MK
Island|island,iceland,reykjavik|IS
Norsko|norsk,norway|NO
Oslo|oslo|>Norsko
Bergen|bergen|>Norsko
Švédsko|svedsk,sweden|SE
Stockholm|stockholm,stokholm|>Švédsko
Göteborg|goteborg,gothenburg|>Švédsko
Dánsko|dansk,denmark|DK
Kodaň|kodan,copenhagen,kopenhagen|>Dánsko
Finsko|finsk,finland|FI
Helsinky|helsink,helsinki|>Finsko
Laponsko|laponsk,lapland,rovaniemi|>Finsko
Estonsko|eston,estonia|EE
Tallinn|tallin|>Estonsko
Lotyšsko|lotys,latvia|LV
Riga|riga|>Lotyšsko
Litva|litv,lithuania|LT
Vilnius|vilni|>Litva
Kaunas|kaunas|>Litva
Nizozemsko|nizozem,netherland,holland|NL
Amsterdam|amsterdam|>Nizozemsko
Rotterdam|rotterdam|>Nizozemsko
Eindhoven|eindhoven|>Nizozemsko
Belgie|belgi,belgium|BE
Brusel|brusel,brussels,charleroi|>Belgie
Brugge|brugg,bruges|>Belgie
Antverpy|antverp|>Belgie
Lucembursko|lucembur,luxembourg|LU
Švýcarsko|svycar,switzerland|CH
Curych|curych,zurich|>Švýcarsko
Ženeva|zenev,geneva|>Švýcarsko
Basilej|basilej,basel|>Švýcarsko
#Asie|asie,asia
Thajsko|thajsk,thai,thailand|TH
Bangkok|bangkok|>Thajsko
Phuket|phuket,puket|>Thajsko
Krabi|krabi|>Thajsko
Koh Samui|samui|>Thajsko
Pattaya|pattay|>Thajsko
Chiang Mai|chiang mai,chiang|>Thajsko
Vietnam|vietnam|VN
Hanoj|hanoj,hanoi|>Vietnam
Ho Či Minovo Město|ho chi minh,saigon,hcmc|>Vietnam
Da Nang|da nang,danang|>Vietnam
Nha Trang|nha trang|>Vietnam
Phu Quoc|phu quoc|>Vietnam
Indonésie|indones,indonesia|ID
Bali|bali|>Indonésie
Jakarta|jakart|>Indonésie
Lombok|lombok|>Indonésie
Filipíny|filipin,philippin|PH
Manila|manil|>Filipíny
Cebu|cebu|>Filipíny
Boracay|borac|>Filipíny
Palawan|palaw|>Filipíny
Malajsie|malajs,malays|MY
Kuala Lumpur|kuala lumpur|>Malajsie
Penang|penang|>Malajsie
Langkawi|langkaw|>Malajsie
Singapur|singap|SG
Japonsko|japon,japan|JP
Tokio|tokio,tokyo|>Japonsko
Osaka|osak|>Japonsko
Kjóto|kjot,kyot|>Japonsko
Okinawa|okinaw|>Japonsko
Čína|cina,cinsk,china,chinese|CN
Peking|peking,beijing|>Čína
Šanghaj|sanghaj,shanghai|>Čína
Hongkong|hongkong,hong kong|HK
Jižní Korea|jizni kore,south korea,korea,korej|KR
Soul|soul,seoul|>Jižní Korea
Pusan|pusan,busan|>Jižní Korea
Tchaj-wan|tchaj,taiwan|TW
Tchaj-pej|tchaj pej,taipei|>Tchaj-wan
Indie|indi,india|IN
Dillí|dilli,delhi|>Indie
Bombaj|bombaj,mumbai|>Indie
Goa|goa|>Indie
Srí Lanka|sri lank|LK
Kolombo|kolomb,colombo|>Srí Lanka
Maledivy|maledivy,maldiv|MV
Nepál|nepal,kathmandu,katmandu|NP
Gruzie|gruzi,tbilisi|GE
Arménie|armeni|AM
Ázerbájdžán|azerbajdzan,azerbaijan,baku|AZ
Uzbekistán|uzbekist,tashkent,samarkand|UZ
Kazachstán|kazachst,kazakhstan,almaty|KZ
Mongolsko|mongol|MN
#Blízký východ|blizky vychod,middle east
Spojené arabské emiráty|emirat,spojene arabske,uae,united arab emirates|AE
Dubaj|dubaj,dubai|>Spojené arabské emiráty
Abú Dhabí|abu dhabi|>Spojené arabské emiráty
Omán|oman,muscat,maskat|OM
Katar|katar,qatar,doha|QA
Izrael|izrael,israel,tel aviv|IL
Jordánsko|jordansk,jordan,akaba,aqaba,petra|JO
Bahrajn|bahrajn,bahrain|BH
Egypt|egypt|EG
Hurghada|hurghad,hurgad|>Egypt
Sharm el-Sheikh|sharm,sarm|>Egypt
Marsa Alam|marsa alam|>Egypt
Káhira|kair,cairo|>Egypt
Luxor|luxor|>Egypt
Asuán|asuan,aswan|>Egypt
Dahab|dahab|>Egypt
#Afrika|afri,africa
Tunisko|tunis,tunisia|TN
Djerba|djerb|>Tunisko
Monastir|monastir|>Tunisko
Hammamet|hammamet|>Tunisko
Maroko|marok,morocco|MA
Marrákeš|marrak,marrakech|>Maroko
Agadir|agadir|>Maroko
Casablanca|casablanc|>Maroko
Keňa|kena,kenya|KE
Nairobi|nairobi|>Keňa
Mombasa|mombas|>Keňa
Tanzanie|tanzani,tanzania|TZ
Zanzibar|zanzibar|>Tanzanie
Kilimandžáro|kilimandzar|>Tanzanie
Jihoafrická republika|jihoafrick,south africa|ZA
Kapské Město|kapske mesto,cape town|>Jihoafrická republika
Johannesburg|johannesburg|>Jihoafrická republika
Mauricius|mauriti,mauritius|MU
Seychely|seychel|SC
Kapverdy|kapverd,cape verde,cabo verde|CV
Namibie|namibi|NA
Madagaskar|madagask|MG
#Severní Amerika|severni amerik,north america
USA|usa,spojene staty,americk,amerik,united states|US
New York|new york,nyc,jfk,newark|>USA
Kalifornie|kalifor,californ|>USA
Los Angeles|los angeles|>Kalifornie
San Francisco|san francisco|>Kalifornie
San Diego|san diego|>Kalifornie
Las Vegas|las vegas|>USA
Florida|florid|>USA
Miami|miami|>Florida
Orlando|orlando,tampa,fort lauderdale|>Florida
Chicago|chicago|>USA
Boston|boston|>USA
Washington|washington|>USA
Seattle|seattle|>USA
Atlanta|atlanta|>USA
Houston|houston|>USA
Dallas|dallas|>USA
Denver|denver|>USA
Phoenix|phoenix|>USA
Havaj|havaj,hawaii,honolulu|>USA
Aljaška|aljask,alaska,anchorage|>USA
Kanada|kanad,canada|CA
Toronto|toronto|>Kanada
Vancouver|vancouv|>Kanada
Montréal|montreal|>Kanada
Calgary|calgar|>Kanada
Mexiko|mexik,mexico|MX
Cancún|cancun,riviera maya,playa del carmen,tulum,cozumel|>Mexiko
#Karibik|karib,caribbean
Kuba|kuba,kube,cuba|CU
Varadero|varader|>Kuba
Havana|havan|>Kuba
Dominikánská republika|dominikan,dominican,punta cana|DO
Jamajka|jamajk,jamaica|JM
Bahamy|baham|BS
Barbados|barbado|BB
Aruba|aruba|AW
Curaçao|curacao|CW
Svatá Lucie|svata lucie,st lucia|LC
Antigua|antigu|AG
#Jižní Amerika|jizni amerik,south america,latinsk
Brazílie|brazil|BR
Rio de Janeiro|rio de janeiro,rio|>Brazílie
São Paulo|sao paulo|>Brazílie
Argentina|argentin|AR
Buenos Aires|buenos aires|>Argentina
Peru|peru|PE
Lima|lima|>Peru
Cusco|cusco,machu picchu|>Peru
Kolumbie|kolumbi,colombia|CO
Bogotá|bogot|>Kolumbie
Cartagena|cartagen|>Kolumbie
Chile|chile|CL
Santiago de Chile|santiago de chile,santiago chile|>Chile
Kostarika|kostarik,costa rica|CR
Panama|panam|PA
Ekvádor|ekvador,ecuador,galapag|EC
#Oceánie|oceani,austral
Austrálie|austral|AU
Sydney|sydney|>Austrálie
Melbourne|melbourn|>Austrálie
Brisbane|brisban|>Austrálie
Perth|perth|>Austrálie
Nový Zéland|novy zeland,new zealand|NZ
Auckland|auckland|>Nový Zéland
Fidži|fidzi,fiji|FJ`;
const geoNz=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const geoStem=a=>(a.length>=6&&/[aeiouy]$/.test(a))?a.slice(0,-1):a;
const geoSuf=s=>s.length<=3?1:s.length<=5?2:3;
const GEO=(()=>{const E=new Map(),kids=new Map();let cont='';
  GEO_SRC.split('\n').forEach(l=>{l=l.trim();if(!l)return;const p=l.split('|');
    if(l[0]==='#'){cont=p[0].slice(1);E.set(cont,{name:cont,al:[cont,...p[1].split(',')],par:'',cc:''});return}
    const f=p[2]||'',sub=f[0]==='>';E.set(p[0],{name:p[0],al:[p[0],...p[1].split(',')],par:sub?f.slice(1):cont,cc:sub?'':f})});
  E.forEach(e=>{e.pats=[...new Set(e.al.map(a=>(/!$/.test(a)?'!':'')+geoNz(a)).filter(a=>a&&a!=='!'))].map(a=>{const ex=a[0]==='!';if(ex)a=a.slice(1);const s=ex?a:geoStem(a),n=ex?0:geoSuf(s);return{s,n,src:s.replace(/ /g,'\\s+')+'[a-z]{0,'+n+'}'}});
    if(e.par){if(!kids.has(e.par))kids.set(e.par,[]);kids.get(e.par).push(e.name)}});
  const sub=name=>{const out=[name],q=[name];while(q.length){const c=q.pop();(kids.get(c)||[]).forEach(k=>{out.push(k);q.push(k)})}return out};
  return{E,kids,sub}})();
const geoResolve=k=>{k=geoNz(k);if(!k)return[];const r=[];GEO.E.forEach(e=>{if(e.pats.some(p=>k===p.s||(k.startsWith(p.s)&&k.length-p.s.length<=p.n&&!/ /.test(k.slice(p.s.length)))))r.push(e)});return r};
const KW_CACHE=new Map();
function kwRx(k){let v=KW_CACHE.get(k);if(v)return v;const lit=geoNz(k),srcs=new Set();
  geoResolve(k).forEach(e=>GEO.sub(e.name).forEach(n=>GEO.E.get(n).pats.forEach(p=>srcs.add(p.src))));
  v={lit,rx:srcs.size?new RegExp('(?<![a-z0-9])(?:'+[...srcs].join('|')+')(?![a-z0-9])'):null};if(KW_CACHE.size>500)KW_CACHE.clear();KW_CACHE.set(k,v);return v}
// kwTest("Sicílie, Kanáry", nabídka): true, když nabídka odpovídá aspoň jednomu slovu (prázdné = vždy)
function kwTest(kws,x){const list=String(kws||'').split(',').map(s=>s.trim()).filter(s=>s&&!/^(kamkoli|kamkoliv|kdekoli|vsude|cokoli)$/.test(geoNz(s)));if(!list.length)return true;
  const h=x._gh||(x._gh=' '+geoNz((x.title||'')+' '+(x.summary||''))+' ');
  return list.some(k=>{const v=kwRx(k);return(v.lit&&h.indexOf(v.lit)>=0)||(v.rx&&v.rx.test(h))})}
// země (kód) pro vlajku cíle, i když slovo není v seznamu měst: Kalábrie > Itálie
function geoCC(k){const r=geoResolve(k)[0];let e=r;while(e){if(e.cc)return e.cc;e=GEO.E.get(e.par)}return''}
