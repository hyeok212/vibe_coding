// TMDB API 설정
const API_KEY = '9fcda8344611fc76edc395934e667443';
const API_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// DOM 요소
const moviesContainer = document.getElementById('movies-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// 페이지 로드 시 영화 데이터 가져오기
document.addEventListener('DOMContentLoaded', fetchMovies);

// 영화 데이터 가져오기
async function fetchMovies() {
    showLoading();
    hideError();

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            displayMovies(data.results);
        } else {
            showError();
        }
    } catch (error) {
        console.error('영화 데이터를 가져오는데 실패했습니다:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// 영화 목록 표시
function displayMovies(movies) {
    moviesContainer.innerHTML = '';

    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesContainer.appendChild(movieCard);
    });
}

// 영화 카드 생성
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // 포스터 이미지
    const posterHTML = movie.poster_path
        ? `<img src="${IMAGE_BASE_URL}${movie.poster_path}" alt="${movie.title}" class="movie-poster" loading="lazy">`
        : `<div class="no-poster">포스터 없음</div>`;

    // 평점 포맷
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    // 개봉일 포맷
    const releaseDate = movie.release_date ? formatDate(movie.release_date) : '미정';

    // 투표 수 포맷
    const voteCount = movie.vote_count ? formatVoteCount(movie.vote_count) : '0';

    card.innerHTML = `
        ${posterHTML}
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <div class="movie-rating">
                    <span class="star-icon">★</span>
                    <span class="rating-value">${rating}</span>
                </div>
                <div class="movie-votes">
                    <span class="vote-icon">👥</span>
                    <span class="vote-value">${voteCount}</span>
                </div>
            </div>
            <div class="movie-release">
                <span class="release-icon">📅</span>
                <span class="release-date">${releaseDate}</span>
            </div>
        </div>
    `;

    return card;
}

// 로딩 표시
function showLoading() {
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

// 에러 표시
function showError() {
    errorElement.style.display = 'block';
}

function hideError() {
    errorElement.style.display = 'none';
}

// 날짜 포맷 (YYYY-MM-DD -> YYYY.MM.DD)
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// 투표 수 포맷 (1000 -> 1K, 1000000 -> 1M)
function formatVoteCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}
