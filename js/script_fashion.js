/* mainIntro */
(function () {
    const speed = 45;           // 글자당 지연(ms)
    const afterEachP = 300;     // p 하나 끝난 뒤 텀(ms)
    const afterAll = 2000;      // 모두 끝나고 다시 시작 전 대기(ms)

    const els = [
        document.querySelector('#mainIntro .bigTitle'),
        document.querySelector('#mainIntro .subText')
    ].filter(Boolean);

    // 원본 HTML/세그먼트 저장 (강조 태그가 글자로 노출되지 않게 text만 타이핑)
    const originals = els.map(el => el.innerHTML);

    function parseParagraph(pEl) {
        const segs = [];
        pEl.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent) segs.push({ type: 'text', bold: false, text: node.textContent });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'STRONG') segs.push({ type: 'text', bold: true, text: node.textContent });
                else if (node.tagName === 'BR') segs.push({ type: 'br' });
                else segs.push({ type: 'text', bold: false, text: node.textContent });
            }
        });
        return segs;
    }
    const parsed = els.map(el => ({ el, segs: parseParagraph(el) }));

    // === 핵심: 타이핑 전 '최종 높이'를 미리 측정해서 min-height로 고정 ===
    function measureAndLockHeight(el, finalHTML) {
        const clone = el.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.pointerEvents = 'none';
        clone.style.height = 'auto';
        clone.style.minHeight = '0';
        clone.innerHTML = finalHTML;               // 최종 내용을 기준으로 실제 높이 측정
        el.parentNode.appendChild(clone);
        const h = Math.ceil(clone.getBoundingClientRect().height);
        clone.remove();
        el.style.minHeight = h + 'px';             // 이 줄이 레이아웃 시프트를 막아줌
    }

    function reserveHeights() {
        els.forEach((el, i) => measureAndLockHeight(el, originals[i]));
    }

    function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

    async function typeText(parent, text, isBold) {
        const holder = isBold ? document.createElement('strong') : document.createElement('span');
        parent.appendChild(holder);
        for (const ch of text) { holder.append(ch); await delay(speed); }
    }

    async function typeParagraph(pEl, segs) {
        pEl.innerHTML = '';
        pEl.style.visibility = 'visible';
        for (const seg of segs) {
            if (seg.type === 'br') pEl.appendChild(document.createElement('br'));
            else if (seg.type === 'text') await typeText(pEl, seg.text, seg.bold);
        }
    }

    async function playOnce() {
        for (const { el } of parsed) { el.style.visibility = 'hidden'; el.innerHTML = ''; }
        for (const { el, segs } of parsed) { await typeParagraph(el, segs); await delay(afterEachP); }
    }

    // 처음에 자리 예약하고 시작
    reserveHeights();

    // 반응형: 창 크기 바뀌면 예약 높이 다시 계산
    let rAF;
    window.addEventListener('resize', () => {
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => reserveHeights());
    });

    (async function loop() {
        while (true) { await playOnce(); await delay(afterAll); }
    })();
})();

/* newtroLook */
(function () {
    const container = document.querySelector('.swipeArea');
    const track = document.querySelector('.swipeArea ul');
    if (!container || !track) return;

    // 카드들을 최소 2배 폭 이상으로 채우도록 복제
    const speed = Number(getComputedStyle(container).getPropertyValue('--speed')) || 60; // px/s

    function setup() {
        // 원본 시퀀스 템플릿 확보
        const template = [...track.children]
            .filter(el => el.getAttribute('data-clone') !== '1')
            .map(el => el.cloneNode(true));

        // 트랙 비우고 여러 회전으로 재구성 (홀수 권장)
        const COPIES = 7;
        track.innerHTML = '';
        for (let i = 0; i < COPIES; i++) {
            const frag = document.createDocumentFragment();
            template.forEach(n => {
                const c = n.cloneNode(true);
                if (i !== Math.floor(COPIES / 2)) c.setAttribute('data-clone', '1');
                frag.appendChild(c);
            });
            track.appendChild(frag);
        }

        // 한 사이클 폭과 가운데 시작점 계산
        const baseWidth = track.scrollWidth / COPIES;
        container.scrollLeft = baseWidth * Math.floor(COPIES / 2);

        // 자동 슬라이드용 CSS 변수(한 사이클만 이동)
        const speed = Number(getComputedStyle(container).getPropertyValue('--speed')) || 60;
        const duration = baseWidth / speed;
        track.style.setProperty('--duration', `${duration}s`);
        track.style.setProperty('--toX', `${-baseWidth}px`);
    }

    // 첫 셋업
    setup();

    // 드래그로 너무 끝까지 갔을 때 보이지 않게 래핑
    function normalize() {
        const trackChildren = track.children.length;
        if (!trackChildren) return;

        const copies = 7; // setup과 동일 값
        const baseWidth = track.scrollWidth / copies;
        const minEdge = baseWidth * 1;
        const maxEdge = baseWidth * (copies - 2);

        const x = container.scrollLeft;
        if (x < minEdge) container.scrollLeft = x + baseWidth;
        else if (x > maxEdge) container.scrollLeft = x - baseWidth;
    }

    // 리사이즈/폰트 로드 등 레이아웃 변화 대응
    let rAF;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(setup);
    });

    document.querySelectorAll('.swipeArea li').forEach(li => {
        li.addEventListener('mouseenter', () => {
            li.closest('ul').style.animationPlayState = 'paused';
        });
        li.addEventListener('mouseleave', () => {
            li.closest('ul').style.animationPlayState = 'running';
        });
    });

    // (A) 이미지/텍스트 선택/드래그 방지
    container.addEventListener('dragstart', e => e.preventDefault());

    // (B) 드래그 스크롤 구현
    // 스크롤바는 CSS로 숨기되, 실제로는 scrollLeft를 이동
    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false; // 드래그 이동 판단(클릭 오작동 방지)

    // 포인터 캡처를 위한 이벤트 (마우스/터치 통합)
    const onPointerDown = (e) => {
        isPointerDown = true;
        moved = false;
        container.setPointerCapture?.(e.pointerId);
        startX = e.clientX;
        startScrollLeft = container.scrollLeft;

        // 자동 슬라이드 일시정지
        track.style.animationPlayState = 'paused';

        container.classList.add('is-dragging');
        container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
        if (!isPointerDown) return;
        const delta = e.clientX - startX;
        if (Math.abs(delta) > 3) moved = true; // 의미 있는 이동
        container.scrollLeft = startScrollLeft - delta;

        normalize(); // ✅ 추가: 드래그 중 경계 넘어가면 즉시 래핑
    };

    const onPointerUp = (e) => {
        if (!isPointerDown) return;
        isPointerDown = false;
        container.releasePointerCapture?.(e.pointerId);

        container.classList.remove('is-dragging');
        container.style.cursor = '';

        // 드래그 종료 후 자동 슬라이드 재생
        track.style.animationPlayState = 'running';
    };

    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerup', onPointerUp, { passive: true });
    container.addEventListener('pointercancel', onPointerUp, { passive: true });
    container.addEventListener('pointerleave', onPointerUp, { passive: true });

    // (C) 드래그 도중 클릭 방지 (카드 내 링크/버튼 등)
    container.addEventListener('click', (e) => {
        if (moved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
})();

/* findStyle */
document.addEventListener('DOMContentLoaded', () => {
    const stepsWrap = document.querySelector('.steps');
    const steps = stepsWrap.querySelectorAll('.step');
    const resultSection = document.getElementById('resultSection');
    const resultImage = document.getElementById('resultImage');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const restartBtn = document.getElementById('restartBtn');

    let currentStep = 1;

    // 결과 데이터 (이미지 경로는 프로젝트에 맞게 교체)
    const STYLE_MAP = {
        S1: {
            title: '모던 시티 레트로',
            img: '../img/result_s1.png',
            desc: '정제되고 도시적인 스타일<br>셔츠, 슬랙스, 심플한 아이템<br>'
        },
        S2: {
            title: '빈티지 클래식룩',
            img: '../img/result_s2.png',
            desc: `클래식한 무드 + 레트로 감성<br>레더·울·코듀로이<br>톤다운 컬러<br>(ex. 브라운, 카키, 네이비)`
        },
        S3: {
            title: '소프트 레트로',
            img: '../img/result_s3.png',
            desc: `부드럽고 감성적인 스타일<br>파스텔, 니트, 워싱된 데님`
        },
        S4: {
            title: '레트로 스트리트',
            img: '../img/result_s4.png',
            desc: `편하고 힙한 무드<br>조거팬츠, 스니커즈, 후디, 트랙탑`
        },
        S5: {
            title: 'Y2K 펑크/하이틴',
            img: '../img/result_s5.png',
            desc: `대담하고 스토티한 Y2K 무드<br>형광, 크롭, 메탈`
        },
        S6: {
            title: '키치 믹스 스타일',
            img: '../img/result_s6.png',
            desc: `레트로 프린팅<br>유니크한 패턴/컬러 아이템<br>믹스매치로 위트 있게!`
        }
    };

    // 다음/이전 버튼 바인딩
    stepsWrap.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!validateStep(currentStep)) return;
            changeStep(currentStep + 1);
        });
    });

    stepsWrap.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => changeStep(currentStep - 1));
    });

    // 제출(결과 보기) 버튼
    stepsWrap.querySelectorAll('.btn-submit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 폼 안에 있더라도 기본 제출 막기
            e.preventDefault();
            if (!validateStep(currentStep)) return;

            const q1 = getValue('q1');
            const q2 = getValue('q2');
            const q3 = getValue('q3');

            const code = calculateStyleResult(q1, q2, q3);
            const data = STYLE_MAP[code];

            // 결과 채우기
            resultImage.src = data.img;
            resultImage.alt = `${data.title} 참고 이미지`;
            resultTitle.textContent = data.title;
            resultDesc.innerHTML = data.desc;

            // 테스트 숨기고 결과 노출
            stepsWrap.hidden = true;
            resultSection.hidden = false;
        });
    });

    // 다시 테스트하기
    restartBtn.addEventListener('click', () => {
        // 라디오 리셋
        stepsWrap.querySelectorAll('input[type="radio"]').forEach((input) => {
            input.checked = false;
            // 선택 비주얼 클래스 제거(옵션)
            input.closest('.option')?.classList.remove('is-selected');
        });

        // 첫 스텝으로 복귀
        resultSection.hidden = true;
        stepsWrap.hidden = false;
        changeStep(1);
    });

    // 라디오 선택 시 시각적 피드백 클래스 토글(옵션)
    stepsWrap.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.addEventListener('change', () => {
            const groupName = input.name;
            const group = stepsWrap.querySelectorAll(`input[name="${groupName}"]`);
            group.forEach(el => el.closest('.option')?.classList.remove('is-selected'));
            input.closest('.option')?.classList.add('is-selected');
        });
    });

    // 유틸: 스텝 전환
    function changeStep(step) {
        const total = steps.length;
        if (step < 1 || step > total) return;
        steps.forEach(s => (s.hidden = true));
        stepsWrap.querySelector(`.step[data-step="${step}"]`).hidden = false;
        currentStep = step;
    }

    // 유틸: 현재 스텝 검증 (라디오 체크 여부)
    function validateStep(step) {
        const section = stepsWrap.querySelector(`.step[data-step="${step}"]`);
        const checked = section.querySelector('input[type="radio"]:checked');
        if (!checked) {
            alert('옵션을 선택해주세요!');
            return false;
        }
        return true;
    }

    // 유틸: 값 가져오기
    function getValue(name) {
        const el = stepsWrap.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : null;
    }

    // 점수 계산 로직
    function calculateStyleResult(q1, q2, q3) {
        const scoreMap = { A: 1, B: 2, C: 3, D: 4 };
        const total = scoreMap[q1] + scoreMap[q2] + scoreMap[q3];

        if (total <= 4) return 'S1';       // 모던 시티 레트로
        else if (total <= 6) return 'S2';  // 빈티지 클래식룩
        else if (total <= 8) return 'S3';  // 소프트 레트로
        else if (total === 9) return 'S4'; // 레트로 스트리트
        else if (total === 12) return 'S6';// 키치 믹스 스타일
        else return 'S5';                  // 10~11 → Y2K 펑크/하이틴
    }
});

/* timeline */
const slider = document.getElementById('timelineContainer');
let isDown = false;
let startX;
let scrollLeft;

// PC 드래그
slider.addEventListener('mousedown', (e) => {
    isDown = true;
    slider.classList.add('active');
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
});

slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.classList.remove('active');
});

slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.classList.remove('active');
});

slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; // *2 = 스크롤 속도
    slider.scrollLeft = scrollLeft - walk;
});

// 모바일 터치
slider.addEventListener('touchstart', (e) => {
    isDown = true;
    startX = e.touches[0].pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
});

slider.addEventListener('touchend', () => {
    isDown = false;
});

slider.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - slider.offsetLeft;
    const walk = (x - startX) * 2;
    slider.scrollLeft = scrollLeft - walk;
});

slider.addEventListener('dragstart', (e) => e.preventDefault());

document.addEventListener("DOMContentLoaded", function () {
    // 1) 연도별 이미지 목록
    const imagesMap = {
        year_1960: ["../img/1960s_01.png", "../img/1960s_02.png", "../img/1960s_03.png", "../img/1960s_04.png"],
        year_1970: ["../img/1970s_05.png", "../img/1970s_02.png", "../img/1970s_03.png", "../img/1970s_04.png", "../img/1970s_01.png"],
        year_1980: ["../img/1980s_01.png", "../img/1980s_02.png", "../img/1980s_03.png", "../img/1980s_04.png"],
        year_1990: ["../img/1990s_02.png", "../img/1990s_01.png", "../img/1990s_03.png", "../img/1990s_04.png", "../img/1990s_05.png"],
        year_2000: ["../img/2000s_04.png", "../img/2000s_01.png", "../img/2000s_02.png", "../img/2000s_03.png"],
    };

    // 2) 각 li(year_****)별로 독립 슬라이더 설정
    document.querySelectorAll("ul > li[class^='year_']").forEach((li) => {
        const slider = li.querySelector(".card_slider");
        if (!slider) return;

        const imgEl = slider.querySelector(".card_slide img");
        const prevBtn = slider.querySelector(".card_nav_prev");
        const nextBtn = slider.querySelector(".card_nav_next");

        // li의 클래스 중 year_* 키 찾기
        const yearKey = Array.from(li.classList).find((c) => c.startsWith("year_"));
        const images = imagesMap[yearKey] || [imgEl.src];

        let index = 0;

        // 이미지 미리 로딩
        images.forEach((src) => { const im = new Image(); im.src = src; });

        // 이미지 전환 함수
        function show(i) {
            index = (i + images.length) % images.length;
            const nextSrc = images[index];
            const pre = new Image();
            // 페이드아웃
            imgEl.style.transition = "opacity .25s ease";
            imgEl.style.opacity = "0";
            pre.onload = () => {
                imgEl.src = nextSrc;
                imgEl.alt = nextSrc.split("/").pop().split(".")[0] || "slide";
                // 페이드인
                requestAnimationFrame(() => {
                    imgEl.style.opacity = "1";
                });
            };
            pre.src = nextSrc;
        }

        // 버튼 이벤트
        prevBtn?.addEventListener("click", () => show(index - 1));
        nextBtn?.addEventListener("click", () => show(index + 1));

        // 초기 표시
        show(0);
    });
});

const container = document.getElementById('timelineContainer');
const track = container?.querySelector('.timeline_track');
const fill = container?.querySelector('#trackFill');
const cardList = container?.querySelector('.timeline_card > ul');
const cards = cardList ? cardList.querySelectorAll(':scope > li') : [];

if (track && fill && cardList && cards.length) {
    function setProgressByElement(el) {
        const trackRect = track.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // li의 중앙 X 좌표
        const elCenterX = elRect.left + elRect.width / 2;

        // 트랙 내 상대 위치(0~1)
        let percent = (elCenterX - trackRect.left) / trackRect.width;
        percent = Math.max(0, Math.min(1, percent));

        // 반영
        const p = (percent * 100).toFixed(3) + '%';
        fill.style.width = p;
    }

    // li hover 시 트랙 진행도 갱신
    cards.forEach(li => {
        li.addEventListener('mouseenter', () => setProgressByElement(li));
    });

    // 카드 영역에서 마우스가 빠지면 0%로 복귀 (원치 않으면 이 블록 삭제)
    cardList.addEventListener('mouseleave', () => {
        fill.style.width = '0%';
    });

    // 창 크기 변경 시, 현재 hover 중인 카드가 있다면 다시 계산(선택 사항)
    window.addEventListener('resize', () => {
        const hovered = Array.from(cards).find(li => li.matches(':hover'));
        if (hovered) setProgressByElement(hovered);
    });
} else {
    // 필수 요소가 없을 때 콘솔 경고 (개발 편의용)
    console.warn('[timeline] 필요한 요소를 찾지 못했습니다.', { track, fill, cardList, cardsLen: cards?.length || 0 });
}