const membersDepartureButton = document.querySelector("button.departure#members");
const join_usDepartureButton = document.querySelector("button.departure#join_us");
const membersReturnButton = document.querySelector("button.return#members");
const join_usReturnButton = document.querySelector("button.return#join_us");

const membersSection = document.querySelector("div.section#members");
const join_usSection = document.querySelector("div.section#join_us");

membersDepartureButton.addEventListener("click", function () {
  join_usSection.classList.remove("active");
  membersSection.classList.add("active");
});
join_usDepartureButton.addEventListener("click", function () {
  membersSection.classList.remove("active");
  join_usSection.classList.add("active");
});
membersReturnButton.addEventListener("click", function () {
  membersSection.classList.remove("active");
});
join_usReturnButton.addEventListener("click", function () {
  join_usSection.classList.remove("active");
});