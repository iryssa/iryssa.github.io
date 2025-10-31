"use strict";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("left").classList.add("active");
  document.getElementById("right").classList.add("active");
  document.getElementById("center").classList.add("active");
});

const leftNavigator = document.getElementById("left");
const moreNavigator = document.getElementById("more");

document.querySelector("button.departure#menu").addEventListener("click", () => {
  leftNavigator.classList.remove("active");
  moreNavigator.classList.add("active");
});

document.querySelector("button.return#menu").addEventListener("click", () => {
  document.querySelectorAll("div.section").forEach(section => {
    section.classList.remove("active");
  });
  moreNavigator.classList.remove("active");
  leftNavigator.classList.add("active");
});

function hideMoreShowLeft() {
  moreNavigator.classList.remove("active");
  leftNavigator.classList.add("active");
}

document.querySelector("button.departure#settings").addEventListener("click", hideMoreShowLeft);
document.querySelector("button.departure#join_us").addEventListener("click", hideMoreShowLeft);

document.querySelectorAll("button.departure").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("div.section").forEach(sec => sec.classList.toggle("active", sec.id === btn.id));
  });
});

document.querySelectorAll("button.return").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(`div.section#${btn.id}`).classList.remove("active");
  });
});