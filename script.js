// === ESTADO GLOBAL ===
let cryptoData = new Map();
let blacklistSet = new Set();
let checkedItems = new Set();

// === MODO ADMIN ===
let isAdminMode = false;
let enterPressCount = 0;
let lastEnterTime = 0;

// === IDIOMA ===
let currentLanguage = 'pt'; // 'pt' ou 'en'

// === TEMA ===
let currentTheme = 'dark'; // 'light' ou 'dark'

// === TEXTOS ===
const texts = {
    pt: {
        searchPlaceholder: 'Pesquisar criptomoedas...',
        subtitle: '~as 100 melhores~ criptomoedas, desconsiderando stablecoins e staked ativos',
        adminHeader: 'MODO ADMIN ATIVO - Mostrando TODAS as moedas (incluindo blacklisted)',
        createBlacklist: 'Criar Blacklist',
        position: '#',
        select: 'Selecionar',
        coin: 'Moeda',
        price: 'Preço',
        marketCap: 'Market Cap',
        topCoins: 'Top',
        coins: 'moedas',
        noCoinsSelected: 'Nenhuma moeda selecionada!',
        flag: '🇺🇸'
    },
    en: {
        searchPlaceholder: 'Search cryptocurrencies...',
        subtitle: '~top 100 best~ cryptocurrencies, excluding stablecoins and staked assets',
        adminHeader: 'ADMIN MODE ACTIVE - Showing ALL coins (including blacklisted)',
        createBlacklist: 'Create Blacklist',
        position: '#',
        select: 'Select',
        coin: 'Coin',
        price: 'Price',
        marketCap: 'Market Cap',
        topCoins: 'Top',
        coins: 'coins',
        noCoinsSelected: 'No coins selected!',
        flag: '🇧🇷'
    }
};

// === CACHE DA API ===
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 segundos
const STORAGE_KEY = 'crypto_market_data';
const STORAGE_TIME_KEY = 'crypto_market_data_time';

// === ATUALIZAÇÃO AUTOMÁTICA ===
let updateInterval;

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', async () => {
    await loadBlacklist();
    
    // Carrega dados do localStorage se disponíveis (para mostrar imediatamente)
    loadFromLocalStorage();
    
    // Busca dados da API (que pode usar cache ou fazer nova requisição)
    await fetchCryptoData();
    
    startPeriodicUpdate();
    setupEventListeners();
    updateLanguage();
    updateTheme();
});

// === CARREGAMENTO DE DADOS ===

async function loadBlacklist() {
    try {
        const response = await fetch('blacklist.json');
        if (response.ok) {
            const blacklistArray = await response.json();
            blacklistSet = new Set(blacklistArray.map(item => item.toLowerCase()));
        }
    } catch (error) {
        console.log('Blacklist não encontrada, usando lista vazia');
        blacklistSet = new Set();
    }
}

async function fetchCryptoData() {
    // Usar cache em memória se ainda válido
    if (isValidCache()) {
        console.log('Usando dados do cache em memória');
        loadDataFromCache();
        return;
    }
    
    // Buscar dados da API
    try {
        console.log('Fazendo nova requisição à API...');
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Salva no cache em memória
        cacheData(data);
        
        // Salva no localStorage
        saveToLocalStorage(data);
        
        // Carrega os dados
        loadDataFromCache();
        
    } catch (error) {
        console.error('Erro ao buscar dados da API:', error);
        
        // Tenta usar dados do cache em memória
        if (cachedData) {
            console.log('Usando dados do cache em memória devido ao erro');
            loadDataFromCache();
        } else {
            // Tenta usar dados do localStorage como fallback
            const localData = loadFromLocalStorage();
            if (localData) {
                console.log('Usando dados do localStorage como fallback');
                cacheData(localData);
                loadDataFromCache();
            } else {
                console.log('Nenhum dado disponível, carregando dados de exemplo');
                loadExampleData();
            }
        }
    }
}

function isValidCache() {
    return cachedData && (Date.now() - lastFetchTime) < CACHE_DURATION;
}

function cacheData(data) {
    cachedData = data;
    lastFetchTime = Date.now();
}

function loadDataFromCache() {
    cryptoData.clear();
    cachedData.forEach(coin => {
        cryptoData.set(coin.symbol.toLowerCase(), coin);
    });
    renderCryptoList();
}

// === FUNÇÕES DE LOCALSTORAGE ===

function loadFromLocalStorage() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        const storedTime = localStorage.getItem(STORAGE_TIME_KEY);
        
        if (storedData && storedTime) {
            const data = JSON.parse(storedData);
            const time = parseInt(storedTime);
            
            // Verifica se os dados são recentes (menos de 1 minuto)
            const isRecent = (Date.now() - time) < 60000; // 1 minuto
            
            if (isRecent) {
                console.log('Carregando dados recentes do localStorage');
                cacheData(data);
                loadDataFromCache();
                return data;
            } else {
                console.log('Dados do localStorage são antigos, serão atualizados');
                return data; // Retorna os dados mesmo que antigos para uso como fallback
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
    }
    
    return null;
}

function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
        console.log('Dados salvos no localStorage');
    } catch (error) {
        console.error('Erro ao salvar dados no localStorage:', error);
    }
}

function loadExampleData() {
    const exampleData = [
        { symbol: 'btc', name: 'Bitcoin', current_price: 109913, market_cap: 2185947661260, market_cap_rank: 1 },
        { symbol: 'eth', name: 'Ethereum', current_price: 2594.34, market_cap: 313212362848, market_cap_rank: 2 },
        { symbol: 'usdt', name: 'Tether', current_price: 1.0, market_cap: 158317941626, market_cap_rank: 3 },
        { symbol: 'xrp', name: 'XRP', current_price: 2.28, market_cap: 134529297963, market_cap_rank: 4 },
        { symbol: 'bnb', name: 'BNB', current_price: 662.42, market_cap: 96640936664, market_cap_rank: 5 }
    ];
    
    console.log('Carregando dados de exemplo...');
    exampleData.forEach(coin => {
        cryptoData.set(coin.symbol.toLowerCase(), coin);
    });
    renderCryptoList();
}

// === RENDERIZAÇÃO ===

function renderCryptoList(filterText = '') {
    const container = document.getElementById('cryptoList');
    container.innerHTML = '';
    
    // Header admin
    if (isAdminMode) {
        const adminHeader = document.createElement('div');
        adminHeader.className = 'admin-header';
        adminHeader.textContent = texts[currentLanguage].adminHeader;
        container.appendChild(adminHeader);
        
        const button = document.createElement('button');
        button.textContent = texts[currentLanguage].createBlacklist;
        button.onclick = createBlacklist;
        container.appendChild(button);
    }
    
    // Tabela
    const table = document.createElement('table');
    
    // Cabeçalho
    const thead = document.createElement('thead');
    const coins = getFilteredCoins(filterText);
    const totalCount = isAdminMode ? `${coins.length} ${texts[currentLanguage].coins}` : `${texts[currentLanguage].topCoins} ${coins.length} ${texts[currentLanguage].coins}`;
    
    thead.innerHTML = `
        <tr>
            <th class="text-center">${texts[currentLanguage].position}</th>
            ${isAdminMode ? `<th class="text-center">${texts[currentLanguage].select}</th>` : ''}
            <th class="text-left">${texts[currentLanguage].coin} (${totalCount})</th>
            <th class="text-right">${texts[currentLanguage].price}</th>
            <th class="text-right">${texts[currentLanguage].marketCap}</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Corpo
    const tbody = document.createElement('tbody');
    coins.forEach((coin, index) => {
        const row = createCoinRow(coin, index + 1);
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Debug
    if (isAdminMode && checkedItems.size > 0) {
        console.log(`Itens marcados: ${Array.from(checkedItems).join(', ').toUpperCase()}`);
    }
}

function createCoinRow(coin, position) {
    const row = document.createElement('tr');
    const isBlacklisted = blacklistSet.has(coin.symbol.toLowerCase());
    
    // Classe para itens blacklisted
    if (isAdminMode && isBlacklisted) {
        row.className = 'blacklisted-row';
    }
    
    // Posição
    const positionCell = document.createElement('td');
    positionCell.className = 'text-center';
    positionCell.textContent = `#${position}`;
    
    // Moeda
    const coinCell = document.createElement('td');
    coinCell.className = 'text-left';
    
    const coinContainer = document.createElement('div');
    coinContainer.className = 'coin-container';
    
    // Imagem
    if (coin.image) {
        const img = document.createElement('img');
        img.src = coin.image;
        img.alt = coin.name;
        img.className = 'coin-image';
        coinContainer.appendChild(img);
    }
    
    // Link
    const link = document.createElement('a');
    link.href = `https://www.coingecko.com/en/coins/${coin.id}`;
    link.target = '_blank';
    
    let nameContent = `${coin.symbol.toUpperCase()} ${coin.name}`;
    if (isAdminMode && isBlacklisted) {
        nameContent = `${nameContent} (BLACKLISTED)`;
    }
    
    link.textContent = nameContent;
    coinContainer.appendChild(link);
    coinCell.appendChild(coinContainer);
    
    // Preço
    const priceCell = document.createElement('td');
    priceCell.className = 'text-right';
    priceCell.textContent = `$${coin.current_price.toFixed(2)}`;
    
    // Market Cap
    const marketCapCell = document.createElement('td');
    marketCapCell.className = 'text-right';
    marketCapCell.textContent = formatMarketCap(coin.market_cap);
    
    // Checkbox admin
    let checkboxCell = null;
    if (isAdminMode) {
        checkboxCell = document.createElement('td');
        checkboxCell.className = 'text-center';
        const checkbox = createCheckbox(coin.symbol.toLowerCase(), isBlacklisted);
        checkboxCell.appendChild(checkbox);
    }
    
    // Adicionar células
    row.appendChild(positionCell);
    if (isAdminMode && checkboxCell) {
        row.appendChild(checkboxCell);
    }
    row.appendChild(coinCell);
    row.appendChild(priceCell);
    row.appendChild(marketCapCell);
    
    return row;
}

function getFilteredCoins(filterText) {
    let filteredCoins = Array.from(cryptoData.values());
    
    // No modo admin, mostra todos os dados (inclusive blacklisted)
    if (isAdminMode) {
        // Apenas aplica filtro de busca se houver
        if (filterText) {
            const term = filterText.toLowerCase();
            filteredCoins = filteredCoins.filter(coin => 
                coin.symbol.toLowerCase().includes(term) || 
                coin.name.toLowerCase().includes(term)
            );
        }
    } else {
        // No modo normal, remove blacklisted e limita a 100
        filteredCoins = filteredCoins
            .filter(coin => {
                // Remove blacklisted
                if (blacklistSet.has(coin.symbol.toLowerCase())) {
                    return false;
                }
                
                // Filtro de busca
                if (filterText) {
                    const term = filterText.toLowerCase();
                    return coin.symbol.toLowerCase().includes(term) || 
                           coin.name.toLowerCase().includes(term);
                }
                
                return true;
            })
            .slice(0, 100); // Limita a 100 maiores
    }
    
    return filteredCoins.sort((a, b) => b.market_cap - a.market_cap);
}

function createCheckbox(symbol, isBlacklisted = false) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.symbol = symbol;
    
    // Se está na blacklist, marca o checkbox automaticamente
    if (isBlacklisted) {
        checkbox.checked = true;
        checkedItems.add(symbol);
    } else {
        checkbox.checked = checkedItems.has(symbol);
    }
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            checkedItems.add(symbol);
            console.log(`Marcado: ${symbol.toUpperCase()} (Total: ${checkedItems.size})`);
        } else {
            checkedItems.delete(symbol);
            console.log(`Desmarcado: ${symbol.toUpperCase()} (Total: ${checkedItems.size})`);
        }
    });
    
    return checkbox;
}

// === UTILITÁRIOS ===

function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(2)}`;
}

// === EVENT LISTENERS ===

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const languageToggle = document.getElementById('languageToggle');
    const themeToggle = document.getElementById('themeToggle');
    
    // Pesquisa em tempo real
    searchInput.addEventListener('input', (e) => {
        renderCryptoList(e.target.value);
    });
    
    // Modo admin secreto
    searchInput.addEventListener('keypress', handleAdminMode);
    
    // Troca de idioma
    languageToggle.addEventListener('click', toggleLanguage);
    
    // Troca de tema
    themeToggle.addEventListener('click', toggleTheme);
}

function handleAdminMode(e) {
    if (e.key !== 'Enter') return;
    
    const currentTime = Date.now();
    const input = e.target.value.toLowerCase();
    
    if (input === 'admin') {
        if (currentTime - lastEnterTime < 1000) {
            enterPressCount++;
            if (enterPressCount >= 2) {
                activateAdminMode();
                enterPressCount = 0;
            }
        } else {
            enterPressCount = 1;
        }
        lastEnterTime = currentTime;
    } else {
        enterPressCount = 0;
    }
}

// === MODO ADMIN ===

function activateAdminMode() {
    isAdminMode = true;
    
    // Carrega itens já blacklisted no estado dos checkboxes
    checkedItems.clear();
    blacklistSet.forEach(symbol => {
        checkedItems.add(symbol);
    });
    
    document.getElementById('searchInput').value = '';
    renderCryptoList();
    console.log('Modo admin ativado - blacklist carregada nos checkboxes');
}

function createBlacklist() {
    const selectedSymbols = Array.from(checkedItems);
    
    if (selectedSymbols.length === 0) {
        alert(texts[currentLanguage].noCoinsSelected);
        return;
    }
    
    // Gera e baixa arquivo
    const json = JSON.stringify(selectedSymbols, null, 2);
    downloadFile(json, 'blacklist.json');
    
    // Atualiza estado
    blacklistSet = new Set(selectedSymbols);
    checkedItems.clear();
    renderCryptoList();
    
    console.log('Blacklist criada:', selectedSymbols);
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// === ATUALIZAÇÃO AUTOMÁTICA ===

function startPeriodicUpdate() {
    updateInterval = setInterval(fetchCryptoData, 60000); // 1 minuto
}

// === IDIOMA ===

function toggleLanguage() {
    currentLanguage = currentLanguage === 'pt' ? 'en' : 'pt';
    updateLanguage();
    renderCryptoList();
}

function updateLanguage() {
    // Atualiza placeholder do search
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = texts[currentLanguage].searchPlaceholder;
    
    // Atualiza subtítulo
    const subtitle = document.querySelector('.subtitle');
    subtitle.textContent = texts[currentLanguage].subtitle;
    
    // Atualiza bandeira
    const languageToggle = document.getElementById('languageToggle');
    languageToggle.textContent = texts[currentLanguage].flag;
    
    // Atualiza idioma da página
    document.documentElement.lang = currentLanguage === 'pt' ? 'pt-BR' : 'en';
}

// === TEMA ===

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    updateTheme();
}

function updateTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (currentTheme === 'dark') {
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
    } else {
        body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙';
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
