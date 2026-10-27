
"use strict";

const $ = (selector) => document.querySelector(selector);

const homeView = $("#homeView");
const individualView = $("#individualView");
const companyView = $("#companyView");
const successModal = $("#successModal");

let currentWorkflow = "";
let individualStep = 1;
let isSubmitting = false;
const selectedDomains = new Set();
const selectedServices = new Set();

$("#year").textContent = new Date().getFullYear();

const companyDomains = [
  "Banque, Assurance & Ingénierie Financière",
  "Commerce & Négociation Commerciale",
  "Communication & Rédaction Administrative",
  "Comptabilité, Fiscalité & Finance",
  "Droit & Législation du Travail",
  "Gestion des Ressources Humaines (GRH)",
  "Logistique & Supply Chain Management",
  "Management & Stratégie d'Entreprise",
  "Marketing Stratégique & Opérationnel",
  "Qualité, Hygiène, Sécurité & Environnement (QHSE)"
];

const companyServices = [
  "Conseil & ingénierie de formation (audit des compétences)",
  "Mentorat & coaching de dirigeants",
  "Placement & mise à disposition du personnel",
  "Incubation & accélération de projets"
];

function showView(view) {
  [homeView, individualView, companyView].forEach((item) => {
    item.classList.add("hidden");
  });

  view.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => {
    currentWorkflow = button.dataset.open === "individualView"
      ? "individual"
      : "company";

    if (currentWorkflow === "individual") {
      individualStep = 1;
      updateIndividualStep();
      showView(individualView);
    } else {
      showView(companyView);
    }
  });
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showView(homeView));
});

$("#homeLink").addEventListener("click", (event) => {
  event.preventDefault();
  showView(homeView);
});

function updateIndividualStep() {
  const first = individualStep === 1;

  $("#individualStep1").classList.toggle("hidden", !first);
  $("#individualStep2").classList.toggle("hidden", first);
  $("#stepLabel").textContent = `Étape ${individualStep} sur 2`;
  $("#progressPercent").textContent = first ? "50 %" : "100 %";
  $("#individualProgress").style.width = first ? "50%" : "100%";
  $("#individualError").textContent = "";
}

function validateField(input, message) {
  if (!input.value.trim()) {
    input.focus();
    $("#individualError").textContent = message;
    return false;
  }

  if (!input.checkValidity()) {
    input.focus();
    $("#individualError").textContent = "Vérifiez le format du champ « " +
      (input.labels?.[0]?.textContent || input.name) + " ».";
    return false;
  }

  return true;
}

function getPhone(countrySelect, otherCodeInput, phoneInput) {
  let prefix = countrySelect.value;

  if (prefix === "other") {
    prefix = otherCodeInput.value.trim();
    if (!/^\+\d{1,4}$/.test(prefix)) {
      throw new Error("Veuillez saisir un indicatif international valide, par exemple +33.");
    }
  }

  const localNumber = phoneInput.value.trim();
  const digits = localNumber.replace(/\D/g, "");

  if (digits.length < 6 || digits.length > 15) {
    throw new Error("Vérifiez le numéro de téléphone : il semble trop court ou trop long.");
  }

  return `${prefix} ${localNumber}`.trim();
}

function setupCountrySelector(selectId, otherId) {
  const select = $(selectId);
  const other = $(otherId);

  function update() {
    const isOther = select.value === "other";
    other.classList.toggle("hidden", !isOther);
    other.required = isOther;
    if (isOther) other.focus();
  }

  select.addEventListener("change", update);
  update();
}

setupCountrySelector("#countryCode", "#otherCode");
setupCountrySelector("#companyCountryCode", "#companyOtherCode");

$("#nextIndividual").addEventListener("click", () => {
  $("#individualError").textContent = "";

  const name = $("#fullName");
  const phone = $("#phone");
  const email = $("#email");

  if (!validateField(name, "Veuillez saisir votre nom complet.")) return;
  if (!validateField(phone, "Veuillez saisir votre numéro de téléphone ou WhatsApp.")) return;

  try {
    getPhone($("#countryCode"), $("#otherCode"), phone);
  } catch (error) {
    $("#individualError").textContent = error.message;
    phone.focus();
    return;
  }

  if (email.value.trim() && !email.checkValidity()) {
    $("#individualError").textContent = "Veuillez vérifier votre adresse e-mail.";
    email.focus();
    return;
  }

  individualStep = 2;
  updateIndividualStep();
  $("#trainingProgram").focus();
});

$("#backIndividual").addEventListener("click", () => {
  individualStep = 1;
  updateIndividualStep();
  $("#fullName").focus();
});

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Le serveur a renvoyé une réponse inattendue. Réessayez plus tard.");
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      typeof result.error === "string" && result.error.trim()
        ? result.error
        : "L'enregistrement n'a pas abouti. Veuillez réessayer."
    );
  }

  return result;
}

function setSubmitting(button, submitting, label) {
  button.disabled = submitting;
  button.textContent = submitting ? "Envoi en cours…" : label;
}

$("#individualForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const errorBox = $("#individualError");
  const button = $("#submitIndividual");
  errorBox.textContent = "";

  const name = $("#fullName");
  const phoneInput = $("#phone");
  const training = $("#trainingProgram");
  const education = $("#educationLevel");
  const email = $("#email");

  if (!validateField(training, "Veuillez choisir la formation souhaitée.")) return;
  if (!validateField(education, "Veuillez sélectionner votre niveau d'études.")) return;

  if (email.value.trim() && !email.checkValidity()) {
    errorBox.textContent = "Veuillez vérifier votre adresse e-mail.";
    email.focus();
    return;
  }

  let fullPhone;
  try {
    fullPhone = getPhone($("#countryCode"), $("#otherCode"), phoneInput);
  } catch (error) {
    errorBox.textContent = error.message;
    phoneInput.focus();
    return;
  }

  const payload = {
    fullName: name.value.trim(),
    phone: fullPhone,
    email: email.value.trim(),
    trainingProgram: training.value,
    educationLevel: education.value
  };

  isSubmitting = true;
  setSubmitting(button, true, "Envoyer ma préinscription");

  try {
    await postJson("/api/preinscriptions", payload);
    $("#individualForm").reset();
    $("#countryCode").value = "+242";
    $("#otherCode").classList.add("hidden");
    $("#otherCode").required = false;
    individualStep = 1;
    updateIndividualStep();
    openSuccessModal("individual");
  } catch (error) {
    errorBox.textContent = error.message ||
      "Une erreur est survenue. Vérifiez votre connexion et réessayez.";
  } finally {
    isSubmitting = false;
    setSubmitting(button, false, "Envoyer ma préinscription");
  }
});

function createCheckbox(labelText, checked, onChange) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  const text = document.createElement("span");

  input.type = "checkbox";
  input.checked = checked;
  text.textContent = labelText;

  input.addEventListener("change", () => onChange(input.checked));

  label.append(input, text);
  return label;
}

function renderDomains(filter = "") {
  const container = $("#domainList");
  container.replaceChildren();

  const normalizedFilter = filter.trim().toLocaleLowerCase("fr");
  const matches = companyDomains.filter((domain) =>
    domain.toLocaleLowerCase("fr").includes(normalizedFilter)
  );

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "domain-empty";
    empty.textContent = "Aucun domaine ne correspond à votre recherche.";
    container.append(empty);
    return;
  }

  matches.forEach((domain) => {
    const card = document.createElement("div");
    card.className = "domain-card";

    const row = document.createElement("div");
    row.className = "domain-options";

    row.append(createCheckbox(domain, selectedDomains.has(domain), (checked) => {
      if (checked) selectedDomains.add(domain);
      else selectedDomains.delete(domain);
      renderDomains($("#domainSearch").value);
      renderSelections();
    }));

    card.append(row);
    container.append(card);
  });
}

function renderServices() {
  const container = $("#serviceList");
  container.replaceChildren();

  companyServices.forEach((service) => {
    container.append(
      createCheckbox(service, selectedServices.has(service), (checked) => {
        if (checked) selectedServices.add(service);
        else selectedServices.delete(service);
        renderServices();
        renderSelections();
      })
    );
  });
}

function renderSelections() {
  const container = $("#selectedItems");
  container.replaceChildren();

  const allItems = [
    ...Array.from(selectedDomains).map((value) => ({ type: "domain", value })),
    ...Array.from(selectedServices).map((value) => ({ type: "service", value }))
  ];

  $("#selectionCount").textContent =
    `${allItems.length} sélection${allItems.length > 1 ? "s" : ""}`;

  if (allItems.length === 0) {
    const empty = document.createElement("span");
    empty.className = "muted";
    empty.textContent = "Aucun domaine ni service sélectionné.";
    container.append(empty);
    return;
  }

  allItems.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "selected-chip";

    const text = document.createElement("span");
    text.textContent = item.value;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Retirer ${item.value}`);
    remove.textContent = "×";

    remove.addEventListener("click", () => {
      if (item.type === "domain") selectedDomains.delete(item.value);
      else selectedServices.delete(item.value);

      renderDomains($("#domainSearch").value);
      renderServices();
      renderSelections();
    });

    chip.append(text, remove);
    container.append(chip);
  });
}

$("#domainSearch").addEventListener("input", (event) => {
  renderDomains(event.target.value);
});

renderDomains();
renderServices();
renderSelections();

$("#companyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const errorBox = $("#companyError");
  const button = $("#submitCompany");
  errorBox.textContent = "";

  const companyName = $("#companyName");
  const contactName = $("#contactName");
  const phoneInput = $("#companyPhone");
  const email = $("#companyEmail");
  const customNeed = $("#customNeed").value.trim();

  if (!validateCompanyField(companyName, "Veuillez saisir le nom de l'entreprise.")) return;
  if (!validateCompanyField(contactName, "Veuillez saisir le nom de la personne à contacter.")) return;

  if (email.value.trim() && !email.checkValidity()) {
    errorBox.textContent = "Veuillez vérifier l'adresse e-mail professionnelle.";
    email.focus();
    return;
  }

  let fullPhone;
  try {
    fullPhone = getPhone(
      $("#companyCountryCode"),
      $("#companyOtherCode"),
      phoneInput
    );
  } catch (error) {
    errorBox.textContent = error.message;
    phoneInput.focus();
    return;
  }

  const selectedModules = Array.from(selectedDomains);
  const businessServices = Array.from(selectedServices);

  if (selectedModules.length === 0 &&
      businessServices.length === 0 &&
      !customNeed) {
    errorBox.textContent =
      "Sélectionnez au moins un domaine, un service ou décrivez votre besoin sur mesure.";
    $("#domainSearch").focus();
    return;
  }

  const payload = {
    companyName: companyName.value.trim(),
    industry: $("#industry").value.trim(),
    contactName: contactName.value.trim(),
    contactTitle: $("#contactTitle").value.trim(),
    phone: fullPhone,
    email: email.value.trim(),
    selectedModules,
    businessServices,
    customNeed
  };

  isSubmitting = true;
  setSubmitting(button, true, "Envoyer la demande de l’entreprise");

  try {
    await postJson("/api/company-preinscriptions", payload);
    $("#companyForm").reset();
    $("#companyCountryCode").value = "+242";
    $("#companyOtherCode").classList.add("hidden");
    $("#companyOtherCode").required = false;
    selectedDomains.clear();
    selectedServices.clear();
    $("#domainSearch").value = "";
    renderDomains();
    renderServices();
    renderSelections();
    openSuccessModal("company");
  } catch (error) {
    errorBox.textContent = error.message ||
      "Une erreur est survenue. Vérifiez votre connexion et réessayez.";
  } finally {
    isSubmitting = false;
    setSubmitting(button, false, "Envoyer la demande de l’entreprise");
  }
});

function validateCompanyField(input, message) {
  if (!input.value.trim()) {
    $("#companyError").textContent = message;
    input.focus();
    return false;
  }

  if (!input.checkValidity()) {
    $("#companyError").textContent = "Veuillez vérifier les informations saisies.";
    input.focus();
    return false;
  }

  return true;
}

function openSuccessModal(workflow) {
  successModal.dataset.workflow = workflow;
  successModal.classList.remove("hidden");
  $("#finishButton").focus();
}

function closeSuccessModal() {
  successModal.classList.add("hidden");
  showView(homeView);
}

$("#finishButton").addEventListener("click", closeSuccessModal);

$("#anotherButton").addEventListener("click", () => {
  successModal.classList.add("hidden");

  if (successModal.dataset.workflow === "company") {
    $("#companyForm").reset();
    selectedDomains.clear();
    selectedServices.clear();
    $("#domainSearch").value = "";
    renderDomains();
    renderServices();
    renderSelections();
    $("#companyError").textContent = "";
    showView(companyView);
    $("#companyName").focus();
  } else {
    $("#individualForm").reset();
    $("#countryCode").value = "+242";
    $("#otherCode").classList.add("hidden");
    $("#otherCode").required = false;
    individualStep = 1;
    updateIndividualStep();
    $("#individualError").textContent = "";
    showView(individualView);
    $("#fullName").focus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !successModal.classList.contains("hidden")) {
    closeSuccessModal();
  }
});
