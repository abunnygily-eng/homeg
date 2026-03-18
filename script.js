// script.js - ИСПРАВЛЕННЫЙ И ОПТИМИЗИРОВАННЫЙ
// Данные приложения
let transactions = JSON.parse(localStorage.getItem('hi-finance-transactions')) || [];
let currentType = 'income';
let currentFilter = 'all';
let currentPeriod = '7d';
let isDarkTheme = localStorage.getItem('hi-finance-theme') === 'dark';
let financeChart = null;

// Категории с иконками
const categories = {
    income: [
        { name: 'Зарплата', icon: '💼', color: '#10B981' },
        { name: 'Фриланс', icon: '💻', color: '#3B82F6' },
        { name: 'Инвестиции', icon: '📈', color: '#8B5CF6' },
        { name: 'Подарок', icon: '🎁', color: '#EC4899' },
        { name: 'Возврат', icon: '↩️', color: '#F59E0B' },
        { name: 'Прочее', icon: '📦', color: '#6B7280' }
    ],
    expense: [
        { name: 'Продукты', icon: '🛒', color: '#EF4444' },
        { name: 'Транспорт', icon: '🚗', color: '#3B82F6' },
        { name: 'Развлечения', icon: '🎬', color: '#8B5CF6' },
        { name: 'Жилье', icon: '🏠', color: '#F59E0B' },
        { name: 'Здоровье', icon: '🏥', color: '#10B981' },
        { name: 'Одежда', icon: '👕', color: '#EC4899' },
        { name: 'Образование', icon: '📚', color: '#8B5CF6' },
        { name: 'Кафе', icon: '☕', color: '#F59E0B' },
        { name: 'Прочее', icon: '📦', color: '#6B7280' }
    ]
};

// Инициализация приложения
function init() {
    // Применить тему
    if (isDarkTheme) {
        applyDarkTheme();
    }
    
    // Инициализировать компоненты
    updateCategoryOptions();
    updateDashboard();
    updateTransactionList();
    setupEventListeners();
    initChart();
    
    console.log('🦉 Hi Finance инициализирован! Версия 2.0');
    showNotification('Добро пожаловать в Hi Finance! 🎉', 'success');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            showTab(this.dataset.tab);
        });
    });

    // Переключение типа операции
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setType(this.dataset.type);
        });
    });

    // Форма добавления операции
    const form = document.getElementById('transaction-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addTransaction();
    });

    // Фильтры операций
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setFilter(this.dataset.filter);
        });
    });

    // Поиск операций
    const searchInput = document.getElementById('search-transactions');
    searchInput.addEventListener('input', debounce(function(e) {
        filterTransactions(e.target.value);
    }, 300));

    // Периоды для графика
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setChartPeriod(this.dataset.period);
        });
    });

    // Экспорт данных
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('export-json').addEventListener('click', exportToJSON);

    // Тема
    const themeSwitch = document.getElementById('theme-switch');
    themeSwitch.addEventListener('click', toggleTheme);

    // Закрытие деталей операции
    document.getElementById('close-details').addEventListener('click', closeTransactionDetails);
    document.querySelector('.transaction-details').addEventListener('click', function(e) {
        if (e.target === this) closeTransactionDetails();
    });

    // Логотип - переход на дашборд
    document.querySelector('.logo').addEventListener('click', function(e) {
        e.preventDefault();
        showTab('dashboard');
    });

    // Нажатие Enter в форме
    document.getElementById('amount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('transaction-form').dispatchEvent(new Event('submit'));
        }
    });
}

// Показать вкладку
function showTab(tabName) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Показать выбранную вкладку
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

    // Обновить данные на вкладке
    if (tabName === 'transactions') {
        filterTransactions(document.getElementById('search-transactions').value);
    } else if (tabName === 'dashboard') {
        updateChart();
    }
}

// Установить тип операции
function setType(type) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.type-btn[data-type="${type}"]`).classList.add('active');
    updateCategoryOptions();
}

// Обновить категории в select
function updateCategoryOptions() {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    
    categories[currentType].forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = `${category.icon} ${category.name}`;
        categorySelect.appendChild(option);
    });
}

// Добавить операцию
function addTransaction() {
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const descriptionInput = document.getElementById('description');

    const amount = amountInput.value;
    const category = categorySelect.value;
    const description = descriptionInput.value.trim();

    // Валидация
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('Введите корректную сумму', 'error');
        amountInput.focus();
        return;
    }

    if (!category) {
        showNotification('Выберите категорию', 'error');
        categorySelect.focus();
        return;
    }

    // Создание операции
    const transaction = {
        id: Date.now() + Math.random(),
        type: currentType,
        amount: parseFloat(amount),
        category: category,
        description: description,
        date: new Date().toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: Date.now(),
        icon: categories[currentType].find(c => c.name === category)?.icon || '📝'
    };

    // Добавление операции
    transactions.unshift(transaction);
    saveTransactions();
    
    // Обновление интерфейса
    updateDashboard();
    updateTransactionList();
    updateChart();
    
    // Сброс формы
    amountInput.value = '';
    categorySelect.value = '';
    descriptionInput.value = '';
    showNotification(`Операция "${category}" добавлена! 🎉`, 'success');
    
    // Анимация успеха
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #34D399 100%)';
    setTimeout(() => {
        submitBtn.style.background = '';
    }, 1000);
    
    // Переход на вкладку операций через 1 секунду
    setTimeout(() => showTab('transactions'), 1000);
}

// Удалить операцию
function deleteTransaction(id, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Удалить эту операцию?')) {
        const transaction = transactions.find(t => t.id === id);
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        updateDashboard();
        updateTransactionList();
        updateChart();
        showNotification(`Операция "${transaction?.category}" удалена`, 'info');
        closeTransactionDetails();
    }
}

// Показать детали операции
function showTransactionDetails(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Заполнение деталей
    document.getElementById('detail-category').textContent = `${transaction.icon} ${transaction.category}`;
    document.getElementById('detail-amount').textContent = formatCurrency(transaction.amount);
    document.getElementById('detail-amount').className = `detail-value ${transaction.type}`;
    document.getElementById('detail-type').textContent = transaction.type === 'income' ? '💹 Доход' : '📉 Расход';
    document.getElementById('detail-date').textContent = transaction.date;
    document.getElementById('detail-description').textContent = transaction.description || '—';
    
    // Показать модальное окно
    document.querySelector('.transaction-details').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть детали операции
function closeTransactionDetails() {
    document.querySelector('.transaction-details').classList.remove('active');
    document.body.style.overflow = '';
}

// Фильтр операций
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-btn[data-filter="${filter}"]`).classList.add('active');
    filterTransactions(document.getElementById('search-transactions').value);
}

// Поиск и фильтрация операций
function filterTransactions(searchTerm) {
    const container = document.getElementById('all-transactions');
    
    let filtered = transactions;
    
    // Применение фильтра по типу
    if (currentFilter !== 'all') {
        filtered = filtered.filter(t => t.type === currentFilter);
    }
    
    // Применение поиска
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(t => 
            t.category.toLowerCase().includes(term) ||
            (t.description && t.description.toLowerCase().includes(term)) ||
            t.amount.toString().includes(term) ||
            t.date.toLowerCase().includes(term)
        );
    }
    
    // Рендеринг списка
    renderTransactionList(filtered, container);
    
    // Обновление счетчиков фильтров
    updateFilterCounts();
}

// Рендеринг списка операций
function renderTransactionList(transactionsArray, container) {
    if (transactionsArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Операции не найдены</p>
                <small>Попробуйте изменить параметры поиска</small>
            </div>
        `;
    } else {
        container.innerHTML = transactionsArray.map(transaction => `
            <div class="transaction ${transaction.type}" onclick="showTransactionDetails(${transaction.id})">
                <div class="transaction-info">
                    <div class="transaction-header">
                        <div class="transaction-category">
                            <span class="category-icon">${transaction.icon || getCategoryIcon(transaction.category)}</span>
                            ${transaction.category}
                        </div>
                        <span class="transaction-tag ${transaction.type}">
                            ${transaction.type === 'income' ? 'Доход' : 'Расход'}
                        </span>
                    </div>
                    <div class="transaction-desc">${transaction.description || 'Без описания'}</div>
                    <div class="transaction-footer">
                        <div class="transaction-date">📅 ${transaction.date}</div>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+ ' : '- '}${formatCurrency(transaction.amount)}
                    <button class="delete-btn" onclick="deleteTransaction(${transaction.id}, event)" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Обновление счетчика
    const countElement = document.getElementById('transactions-count');
    if (countElement) {
        countElement.textContent = `(${transactionsArray.length})`;
    }
}

// Обновление дашборда
function updateDashboard() {
    // Расчет статистики
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;

    // Форматирование и отображение
    document.getElementById('balance').textContent = formatCurrency(balance);
    document.getElementById('income').textContent = formatCurrency(income);
    document.getElementById('expense').textContent = formatCurrency(expense);
    
    // Обновление футера
    document.getElementById('footer-balance').textContent = formatCurrency(balance);
    document.getElementById('footer-transactions').textContent = transactions.length;
    document.getElementById('footer-categories').textContent = 
        new Set(transactions.map(t => t.category)).size;
    
    // Обновление бейджей
    document.getElementById('total-transactions').textContent = transactions.length;
    document.getElementById('all-count').textContent = transactions.length;
    
    // Обновление последних операций
    updateRecentTransactions();
    
    // Обновление счетчиков фильтров
    updateFilterCounts();
}

// Обновление последних операций
function updateRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    const recentTransactions = transactions.slice(0, 5);
    
    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>Пока нет операций</p>
                <small>Добавьте первую операцию на вкладке "Добавить"</small>
            </div>
        `;
    } else {
        container.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction ${transaction.type}" onclick="showTransactionDetails(${transaction.id})">
                <div class="transaction-info">
                    <div class="transaction-header">
                        <div class="transaction-category">
                            <span class="category-icon">${transaction.icon}</span>
                            ${transaction.category}
                        </div>
                    </div>
                    <div class="transaction-desc">${transaction.description || 'Без описания'}</div>
                    <div class="transaction-footer">
                        <div class="transaction-date">📅 ${transaction.date}</div>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+ ' : '- '}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
    }
}

// Обновление счетчиков фильтров
function updateFilterCounts() {
    const allCount = transactions.length;
    const incomeCount = transactions.filter(t => t.type === 'income').length;
    const expenseCount = transactions.filter(t => t.type === 'expense').length;
    
    document.getElementById('filter-all').textContent = allCount;
    document.getElementById('filter-income').textContent = incomeCount;
    document.getElementById('filter-expense').textContent = expenseCount;
}

// Обновление списка операций
function updateTransactionList() {
    filterTransactions(document.getElementById('search-transactions')?.value || '');
}

// Инициализация графика
function initChart() {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;
    
    // Уничтожить существующий график если есть
    if (financeChart) {
        financeChart.destroy();
    }
    
    financeChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Доходы',
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.2,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Расходы',
                    data: [],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.2,
                    pointBackgroundColor: '#EF4444',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    titleColor: '#F9FAFB',
                    bodyColor: '#F9FAFB',
                    borderColor: '#4B5563',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 6,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'var(--text-light)',
                        font: {
                            size: 10,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'var(--text-light)',
                        font: {
                            size: 10,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        callback: function(value) {
                            if (value === 0) return '0';
                            if (value >= 1000) {
                                return (value / 1000).toFixed(0) + 'k';
                            }
                            return value;
                        },
                        maxTicksLimit: 5
                    }
                }
            },
            animation: {
                duration: 0
            },
            elements: {
                line: {
                    cubicInterpolationMode: 'monotone'
                }
            }
        }
    });
    
    updateChart();
}

// Обновление данных графика
function updateChart() {
    if (!financeChart) return;
    
    const periodData = getChartDataForPeriod(currentPeriod);
    financeChart.data.labels = periodData.labels;
    financeChart.data.datasets[0].data = periodData.income;
    financeChart.data.datasets[1].data = periodData.expense;
    financeChart.update('none');
}

// Установка периода графика
function setChartPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.chart-period-btn[data-period="${period}"]`).classList.add('active');
    updateChart();
}

// Получение данных для графика по периоду
function getChartDataForPeriod(period) {
    let days;
    switch(period) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
    }
    
    const labels = [];
    const incomeData = new Array(days).fill(0);
    const expenseData = new Array(days).fill(0);
    
    // Заполнение дат
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        if (days <= 7) {
            labels.push(date.getDate().toString());
        } else if (days <= 30) {
            if (i % 3 === 0 || i === days - 1 || i === 0) {
                labels.push(date.getDate().toString());
            } else {
                labels.push('');
            }
        } else {
            if (i % 7 === 0 || i === days - 1 || i === 0) {
                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                labels.push(monthNames[date.getMonth()]);
            } else {
                labels.push('');
            }
        }
    }
    
    // Оптимизированное заполнение данных
    const oneDay = 24 * 60 * 60 * 1000;
    const nowTime = now.getTime();
    
    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.timestamp || Date.now());
        const dayDiff = Math.floor((nowTime - transactionDate.getTime()) / oneDay);
        
        if (dayDiff >= 0 && dayDiff < days) {
            const index = days - 1 - dayDiff;
            if (transaction.type === 'income') {
                incomeData[index] += transaction.amount;
            } else {
                expenseData[index] += transaction.amount;
            }
        }
    });
    
    return { labels, income: incomeData, expense: expenseData };
}

// Экспорт в CSV
function exportToCSV() {
    if (transactions.length === 0) {
        showNotification('Нет данных для экспорта', 'error');
        return;
    }
    
    const headers = ['Тип', 'Сумма', 'Категория', 'Описание', 'Дата'];
    const rows = transactions.map(t => [
        t.type === 'income' ? 'Доход' : 'Расход',
        t.amount,
        t.category,
        t.description || '',
        t.date
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    downloadFile(csvContent, `hi-finance-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotification('Данные экспортированы в CSV', 'success');
}

// Экспорт в JSON
function exportToJSON() {
    if (transactions.length === 0) {
        showNotification('Нет данных для экспорта', 'error');
        return;
    }
    
    const data = {
        app: 'Hi Finance',
        version: '2.0',
        exportDate: new Date().toISOString(),
        statistics: {
            total: transactions.length,
            income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
        },
        transactions: transactions
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `hi-finance-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showNotification('Данные экспортированы в JSON', 'success');
}

// Загрузка файла
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Переключение темы
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    
    if (isDarkTheme) {
        applyDarkTheme();
    } else {
        applyLightTheme();
    }
    
    localStorage.setItem('hi-finance-theme', isDarkTheme ? 'dark' : 'light');
    
    // Обновление графика при смене темы
    if (financeChart) {
        // Обновляем цвета текста
        const textColor = isDarkTheme ? '#D1D5DB' : '#6B7280';
        financeChart.options.scales.x.ticks.color = textColor;
        financeChart.options.scales.y.ticks.color = textColor;
        financeChart.update('none');
    }
}

// Применить темную тему
function applyDarkTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-switch').textContent = '☀️';
    document.getElementById('theme-switch').style.background = 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)';
}

// Применить светлую тему
function applyLightTheme() {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('theme-switch').textContent = '🌙';
    document.getElementById('theme-switch').style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)';
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Удалить старое уведомление
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (oldNotification.parentNode) {
                oldNotification.parentNode.removeChild(oldNotification);
            }
        }, 300);
    }
    
    // Создать новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Сохранить транзакции
function saveTransactions() {
    localStorage.setItem('hi-finance-transactions', JSON.stringify(transactions));
}

// Форматирование валюты
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Получить иконку категории
function getCategoryIcon(category) {
    const allCategories = [...categories.income, ...categories.expense];
    const found = allCategories.find(c => c.name === category);
    return found ? found.icon : '📝';
}

// Дебаунс для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);

// Сообщение в консоль
console.log(`
🦉 Hi Finance - Умный учет финансов
✨ Версия 2.1 (Исправленная)
📅 ${new Date().toLocaleDateString('ru-RU')}
🚀 Все баги исправлены!
`);