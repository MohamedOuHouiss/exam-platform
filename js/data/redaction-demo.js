/* ===================================================
   REDACTION DEMO DATA — 40 rédaction prompts (French)
   Mix of direct questions + clinical-case grouped
   =================================================== */

export const redactionQuestions = [
    // ── Standalone Questions (1-8) ──
    {
        id: 1,
        text: "Décrivez les mécanismes physiopathologiques de l'insuffisance cardiaque gauche. Précisez les conséquences hémodynamiques en amont et en aval.",
    },
    {
        id: 2,
        text: "Énumérez et expliquez les différentes étapes de la réponse immunitaire adaptative humorale face à une infection bactérienne.",
    },
    {
        id: 3,
        text: "Décrivez l'anatomie descriptive et les rapports du rein droit. Illustrez votre réponse par un schéma annoté si nécessaire.",
    },
    {
        id: 4,
        text: "Expliquez le mécanisme d'action des antibiotiques bêta-lactamines et les principaux mécanismes de résistance bactérienne.",
    },
    {
        id: 5,
        text: "Décrivez la physiologie de la filtration glomérulaire. Quels sont les facteurs déterminant le débit de filtration glomérulaire (DFG) ?",
    },
    {
        id: 6,
        text: "Quels sont les critères diagnostiques du diabète selon l'OMS ? Décrivez les différences physiopathologiques entre le diabète de type 1 et le diabète de type 2.",
    },
    {
        id: 7,
        text: "Décrivez les voies de la douleur depuis le récepteur nociceptif périphérique jusqu'au cortex cérébral. Mentionnez les principaux neurotransmetteurs impliqués.",
    },
    {
        id: 8,
        text: "Expliquez le cycle menstruel en détaillant les phases ovarienne et utérine, ainsi que la régulation hormonale hypothalamo-hypophyso-ovarienne.",
    },

    // ── Clinical Case 1 (Questions 9-14) ──
    {
        id: 9,
        clinicalCase: {
            title: "Cas Clinique 1 — Pneumologie",
            text: "Un homme de 62 ans, ancien mineur, tabagique actif à 40 paquets-année, consulte pour une dyspnée progressive depuis 6 mois, actuellement au stade III de la classification mMRC. Il présente une toux productive matinale chronique avec des expectorations muqueuses. L'auscultation retrouve des sibilants diffus bilatéraux et un allongement du temps expiratoire. La spirométrie montre : VEMS = 45% de la valeur prédite, VEMS/CVF = 58%, avec un test de réversibilité négatif après bronchodilatateur. La radiographie thoracique montre une distension thoracique avec aplatissement des coupoles diaphragmatiques.",
        },
        text: "Analysez les données cliniques et paracliniques. Quel diagnostic évoquez-vous ? Justifiez votre réponse en vous basant sur les critères diagnostiques.",
    },
    {
        id: 10,
        clinicalCaseRef: 9,
        text: "Classifiez la sévérité de cette pathologie selon la classification GOLD. Justifiez le stade retenu.",
    },
    {
        id: 11,
        clinicalCaseRef: 9,
        text: "Détaillez la prise en charge thérapeutique complète : mesures non pharmacologiques et traitement médicamenteux adapté au stade.",
    },
    {
        id: 12,
        clinicalCaseRef: 9,
        text: "Quelles complications à long terme redoutez-vous chez ce patient ? Décrivez les mécanismes physiopathologiques de chacune.",
    },
    {
        id: 13,
        clinicalCaseRef: 9,
        text: "Le patient revient 3 mois plus tard avec une aggravation aiguë : fièvre à 38,8°C, expectoration purulente verdâtre, et augmentation de la dyspnée. Quel diagnostic évoquez-vous et quelle est votre conduite à tenir ?",
    },
    {
        id: 14,
        clinicalCaseRef: 9,
        text: "Discutez l'intérêt de la réhabilitation respiratoire chez ce patient. Quels en sont les objectifs et les modalités pratiques ?",
    },

    // ── Standalone Questions (15-20) ──
    {
        id: 15,
        text: "Décrivez la vascularisation artérielle de l'encéphale (cercle artériel de Willis). Quel est l'intérêt fonctionnel de cette disposition anatomique ?",
    },
    {
        id: 16,
        text: "Expliquez les mécanismes physiopathologiques de l'état de choc septique. Détaillez les perturbations hémodynamiques et métaboliques.",
    },
    {
        id: 17,
        text: "Décrivez les principes de l'antibiothérapie probabiliste. Quels sont les critères de choix d'un antibiotique en première intention ?",
    },
    {
        id: 18,
        text: "Quelles sont les différentes classifications des fractures ? Décrivez les principes de traitement d'une fracture ouverte de jambe.",
    },
    {
        id: 19,
        text: "Expliquez les mécanismes de la régulation de la pression artérielle à court, moyen et long terme.",
    },
    {
        id: 20,
        text: "Décrivez l'histologie de la paroi de l'estomac. Précisez la fonction de chaque type cellulaire de la muqueuse gastrique.",
    },

    // ── Clinical Case 2 (Questions 21-26) ──
    {
        id: 21,
        clinicalCase: {
            title: "Cas Clinique 2 — Endocrinologie",
            text: "Une femme de 35 ans consulte pour une asthénie intense, une perte de poids de 8 kg en 2 mois malgré un appétit conservé, des palpitations, et une nervosité inhabituelle. L'examen clinique retrouve : un tremblement fin des extrémités, une tachycardie régulière à 110 bpm, une exophtalmie bilatérale, et un goitre diffus homogène vasculaire avec un thrill palpable. Le bilan thyroïdien montre : TSH < 0,01 mUI/L (N : 0,4-4), T4L = 52 pmol/L (N : 9-19), T3L = 18 pmol/L (N : 2,6-5,7). Les anticorps anti-récepteurs de la TSH (TRAK) sont positifs à 15 UI/L.",
        },
        text: "Quel diagnostic retenez-vous ? Argumentez votre réponse en vous basant sur les données cliniques et biologiques.",
    },
    {
        id: 22,
        clinicalCaseRef: 21,
        text: "Expliquez le mécanisme physiopathologique de cette maladie. Comment expliquez-vous l'exophtalmie ?",
    },
    {
        id: 23,
        clinicalCaseRef: 21,
        text: "Quels examens complémentaires demanderiez-vous ? Justifiez chaque examen.",
    },
    {
        id: 24,
        clinicalCaseRef: 21,
        text: "Détaillez le traitement médical initial. Précisez les molécules, posologies et la surveillance.",
    },
    {
        id: 25,
        clinicalCaseRef: 21,
        text: "La patiente souhaite une grossesse dans un an. Quelles précautions thérapeutiques spécifiques prenez-vous ? Existe-t-il des contre-indications ?",
    },
    {
        id: 26,
        clinicalCaseRef: 21,
        text: "Discutez les alternatives thérapeutiques en cas d'échec ou de récidive après un traitement médical bien conduit.",
    },

    // ── Standalone Questions (27-32) ──
    {
        id: 27,
        text: "Décrivez la structure et la fonction de l'hémoglobine. Expliquez la courbe de dissociation de l'oxyhémoglobine et les facteurs qui la modifient.",
    },
    {
        id: 28,
        text: "Quels sont les principes éthiques fondamentaux en médecine (principisme de Beauchamp et Childress) ? Illustrez chacun par un exemple clinique.",
    },
    {
        id: 29,
        text: "Décrivez les différentes phases de la cicatrisation cutanée. Quels sont les facteurs qui peuvent retarder la cicatrisation ?",
    },
    {
        id: 30,
        text: "Expliquez les mécanismes de l'absorption intestinale des nutriments (glucides, lipides, protéines) au niveau de l'entérocyte.",
    },
    {
        id: 31,
        text: "Décrivez la classification TNM des cancers. Quel est son intérêt en pratique clinique pour la décision thérapeutique ?",
    },
    {
        id: 32,
        text: "Expliquez les principes de la pharmacocinétique : absorption, distribution, métabolisme et élimination. Donnez des exemples de facteurs influençant chaque étape.",
    },

    // ── Clinical Case 3 (Questions 33-38) ──
    {
        id: 33,
        clinicalCase: {
            title: "Cas Clinique 3 — Neurologie",
            text: "Un homme de 70 ans, hypertendu et diabétique, est amené aux urgences pour un déficit neurologique brutal survenu il y a 1 heure. L'examen neurologique retrouve : une hémiplégie droite proportionnelle, une paralysie faciale centrale droite, une aphasie de Broca, et une déviation conjuguée de la tête et des yeux vers la gauche. Score NIHSS : 18. Le scanner cérébral sans injection réalisé en urgence est normal.",
        },
        text: "Quel diagnostic évoquez-vous ? Justifiez par l'analyse du tableau clinique et du scanner.",
    },
    {
        id: 34,
        clinicalCaseRef: 33,
        text: "Quel territoire vasculaire est atteint ? Justifiez par la sémiologie présentée.",
    },
    {
        id: 35,
        clinicalCaseRef: 33,
        text: "Quelle est la conduite à tenir en urgence ? Détaillez les critères d'éligibilité et les contre-indications du traitement spécifique.",
    },
    {
        id: 36,
        clinicalCaseRef: 33,
        text: "Quels examens complémentaires demandez-vous dans les premières 24 heures ? Justifiez chacun.",
    },
    {
        id: 37,
        clinicalCaseRef: 33,
        text: "Décrivez les mesures de prévention secondaire à mettre en place chez ce patient.",
    },
    {
        id: 38,
        clinicalCaseRef: 33,
        text: "Le patient développe des troubles de la déglutition au 3ème jour. Quelle complication redoutez-vous et quelle est votre prise en charge ?",
    },

    // ── Standalone Questions (39-40) ──
    {
        id: 39,
        text: "Comparez la mitose et la méiose en termes de déroulement, résultat et signification biologique. Présentez votre réponse sous forme de tableau comparatif.",
    },
    {
        id: 40,
        text: "Décrivez les indications, la technique et les complications de la ponction lombaire. Quels sont les résultats normaux de l'analyse du liquide cérébrospinal ?",
    },
];
