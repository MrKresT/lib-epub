(function opens() {
  let params = URLSearchParams && new URLSearchParams(document.location.search.substring(1));
  //передаем урл какой-то книги
  let url = params && params.get("url") && decodeURIComponent(params.get("url"));
  //страница
  let currentSectionIndex = (params && params.get("loc")) ? params.get("loc") : undefined;
  //двухколонковость (both, none)
  let spread = (params && params.get("spread")) ? params.get("spread") : 'none';
  let width = (params && params.get("width")) ? params.get("width") : '100%';
  let height = (params && params.get("height")) ? params.get("height") : '98%';


  // Load the opf for example
  let book = ePub(url || "https://s3.amazonaws.com/moby-dick/moby-dick.epub");

  let rendition = book.renderTo("viewer", {
    width: width,
    height: height,
    spread: spread,
  });

  rendition.display(currentSectionIndex);

  //книга загрузилась
  book.ready.then(function () {

    //подключение событий к стрелкам на экране
    let next = document.getElementById("next");

    next.addEventListener("click", function (e) {
      book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
      e.preventDefault();
    }, false);

    let prev = document.getElementById("prev");
    prev.addEventListener("click", function (e) {
      book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
      e.preventDefault();
    }, false);

    //подключение событий к стрелкам на клавиатуре
    let keyListener = function (e) {
      // Left Key
      if ((e.keyCode || e.which) == 37) {
        book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
      }

      // Right Key
      if ((e.keyCode || e.which) == 39) {
        book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
      }

    };

    rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener, false);
  })

  let title = document.getElementById("title");

  //произошли изменения в отображении книги (перешли на другую страницу)
  rendition.on("rendered", function (section) {

    //корректировка отображения текущего раздела в селекте
    let current = book.navigation && book.navigation.get(section.href);

    if (current) {
      let $select = document.getElementById("toc");
      let $selected = $select.querySelector("option[selected]");
      if ($selected) {
        $selected.removeAttribute("selected");
      }

      let $options = $select.querySelectorAll("option");
      for (let i = 0; i < $options.length; ++i) {
        let selected = $options[i].getAttribute("ref") === current.href;
        if (selected) {
          $options[i].setAttribute("selected", "");
        }
      }
    }

    //обработка свайпов
    let touchstartX = 0;
    let touchstartY = 0;
    let touchendX = 0;
    let touchendY = 0;

    let handleTouchStart = function (event) {
      touchstartX = event.changedTouches[0].screenX;
      touchstartY = event.changedTouches[0].screenY;
    }

    let handleTouchEnd = function (event) {
      touchendX = event.changedTouches[0].screenX;
      touchendY = event.changedTouches[0].screenY;
      handleSwipeGesture();
    }

    let handleSwipeGesture = function () {
      if (touchendX < touchstartX && Math.abs(touchstartY - touchendY) < 20) {
        rendition.next();
      }

      if (touchendX > touchstartX && Math.abs(touchstartY - touchendY) < 20) {
        rendition.prev();
      }

      // после обработки свайпа обнуляем значения
      touchstartX = 0;
      touchendX = 0;
      touchstartY = 0;
      touchendY = 0;
    }

    let el = document.querySelector("iframe");
    el.contentWindow.document.addEventListener('touchstart', handleTouchStart, false);
    el.contentWindow.document.addEventListener('touchend', handleTouchEnd, false);

  });

  rendition.on("relocated", function (location) {

    let next = book.package.metadata.direction === "rtl" ? document.getElementById("prev") : document.getElementById("next");
    let prev = book.package.metadata.direction === "rtl" ? document.getElementById("next") : document.getElementById("prev");

    if (location.atEnd) {
      next.style.visibility = "hidden";
    } else {
      next.style.visibility = "visible";
    }

    if (location.atStart) {
      prev.style.visibility = "hidden";
    } else {
      prev.style.visibility = "visible";
    }

  });

  rendition.on("layout", function (layout) {
    let viewer = document.getElementById("viewer");

    if (layout.spread) {
      viewer.classList.remove('single');
    } else {
      viewer.classList.add('single');
    }
  });

  window.addEventListener("unload", function () {
    console.log("unloading");
    this.book.destroy();
  });

  book.loaded.navigation.then(function (toc) {
    //формирование списка для выбора содержимого
    let $select = document.getElementById("toc"),
      docfrag = document.createDocumentFragment();

    toc.forEach(function (chapter) {
      let option = document.createElement("option");
      option.textContent = chapter.label;
      option.setAttribute("ref", chapter.href);

      docfrag.appendChild(option);
    });

    $select.appendChild(docfrag);

    $select.onchange = function () {
      let index = $select.selectedIndex,
        url = $select.options[index].getAttribute("ref");
      rendition.display(url);
      return false;
    };

  });
})();
