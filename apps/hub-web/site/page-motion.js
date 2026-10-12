(function (window) {
  "use strict";
  window.PrymeiraMotion = {
    create: function (options) {
      var document = window.document;
      var pending = 0, destroyed = false, touch = 0;
      var previousTouch, previousMeet, previousAway;
      function schedule() {
        if (!destroyed && !document.hidden && !pending) pending = window.requestAnimationFrame(frame);
      }
      function frame() {
        pending = 0;
        if (destroyed || document.hidden) return;
        // Read geometry before writing styles to avoid repeated layout work.
        var height = window.innerHeight;
        var max = options.root.scrollHeight - height;
        var page = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        var goal = Math.min(1, page * 0.5 + options.teamCount() / 6 * 0.5);
        touch += (goal - touch) * (options.reduce ? 1 : 0.08);
        var moving = Math.abs(goal - touch) > 0.0005;
        if (!moving) touch = goal;
        var close = options.close.getBoundingClientRect();
        var team = options.teamElement.getBoundingClientRect();
        var ledger = options.ledger.getBoundingClientRect();
        var away = team.top > height * 0.4 || (ledger.top < height && ledger.bottom > 0) || close.top < height * 0.75;
        var nextTouch = touch.toFixed(3);
        var nextMeet = options.reduce ? 1 : Math.max(0, Math.min(1, (height - close.top) / height)).toFixed(3);
        if (nextTouch !== previousTouch) { options.root.style.setProperty("--touch", nextTouch); previousTouch = nextTouch; }
        if (nextMeet !== previousMeet) { options.close.style.setProperty("--meet", nextMeet); previousMeet = nextMeet; }
        if (away !== previousAway) { options.pill.classList.toggle("away", away); previousAway = away; }
        if (moving) schedule();
      }
      function visibility() {
        if (document.hidden && pending) { window.cancelAnimationFrame(pending); pending = 0; }
        else schedule();
      }
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
      document.addEventListener("visibilitychange", visibility);
      var observer;
      if (window.ResizeObserver) { observer = new window.ResizeObserver(schedule); observer.observe(document.body); }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
      schedule();
      return {
        refresh: schedule,
        destroy: function () {
          destroyed = true;
          if (pending) window.cancelAnimationFrame(pending);
          window.removeEventListener("scroll", schedule);
          window.removeEventListener("resize", schedule);
          document.removeEventListener("visibilitychange", visibility);
          if (observer) observer.disconnect();
        }
      };
    }
  };
})(window);
