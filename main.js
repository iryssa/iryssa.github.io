"use strict";

const sections = document.querySelectorAll("div.section");

document.querySelectorAll("button.departure").forEach(btn => {
  btn.addEventListener("click", () => {
    sections.forEach(sec => sec.classList.toggle("active", sec.id === btn.id));
  });
});

document.querySelectorAll("button.return").forEach(btn => {
  btn.addEventListener("click", () => {
    const sec = document.querySelector(`div.section#${btn.id}`);
    if (sec) sec.classList.remove("active");
  });
});