//scroll
const pages = document.querySelectorAll("section");
let currentPage = 0;
let isScrolling = false;

window.addEventListener("wheel", (e) => {
    if (isScrolling) return;
    isScrolling = true;

    if (e.deltaY > 0) {
        if (currentPage < pages.length - 1) {
            currentPage++;
        }
    } else {
        if (currentPage > 0) {
            currentPage--;
        }
    }
    window.scrollTo({
        top: pages[currentPage].offsetTop,
        behavior: "smooth",
    });

    setTimeout(() => {
        isScrolling = false;
    }, 400);
})

//cafe
const images = ["../img/place_mainimg.png", "../img/place_mainimg_2.png", "../img/place_mainimg_3.png"]; // 교체할 이미지들
let currentIndex = 0;

const slideImg = document.getElementById("slideImg");
const prevBtn = document.querySelector(".left");
const nextBtn = document.querySelector(".right");

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  slideImg.src = images[currentIndex];
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % images.length;
  slideImg.src = images[currentIndex];
});

//lpBar
const cards = document.querySelectorAll(".music");
let currentAudio = null;

cards.forEach(card => {
  const audioSrc = card.dataset.audio;
  const audio = new Audio(audioSrc);

  const playBtn = card.querySelector(".play");
  const pauseBtn = card.querySelector(".pause");

  playBtn.addEventListener("click", () => {
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    audio.play();
    currentAudio = audio;
  });

  pauseBtn.addEventListener("click", () => {
    audio.pause();
    if (currentAudio === audio) currentAudio = null;
  });
});