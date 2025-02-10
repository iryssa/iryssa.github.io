"use strict";

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("left").classList.add("active");
  document.getElementById("right").classList.add("active");
  document.getElementById("center").classList.add("active");
});

const leftNavigator = document.getElementById("left");
const moreNavigator = document.getElementById("more");

const menuDepartureButton = document.querySelector("button.departure#menu");
const menuReturnButton = document.querySelector("button.return#menu");
const settingsDepartureButton = document.querySelector("button.departure#settings");
const join_usDepartureButton = document.querySelector("button.departure#join_us");

menuDepartureButton.addEventListener("click", function() {
  leftNavigator.classList.remove("active");
  moreNavigator.classList.add("active");
});

menuReturnButton.addEventListener("click", function() {
  const sections = document.querySelectorAll("div.section");
  sections.forEach(function(section) {
    section.classList.remove("active");
  });
  moreNavigator.classList.remove("active");
  leftNavigator.classList.add("active");
});

function hideMoreShowLeft() {
  moreNavigator.classList.remove("active");
  leftNavigator.classList.add("active");
}

settingsDepartureButton.addEventListener("click", hideMoreShowLeft);
join_usDepartureButton.addEventListener("click", hideMoreShowLeft);

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