/**
 * XAERISOFT WHATSAPP APPEAL GENERATOR
 * Author & Design System: Xaerisoft Core
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const appealForm = document.getElementById('appealForm');
    const fullNameInput = document.getElementById('fullName');
    const waNumberInput = document.getElementById('waNumber');
    const emailInput = document.getElementById('email');
    const languageSelect = document.getElementById('language');
    const radioCards = document.querySelectorAll('.radio-card');
    
    const emptyState = document.getElementById('emptyState');
    const resultContainer = document.getElementById('resultContainer');
    const subjectOutput = document.getElementById('subjectOutput');
    const bodyOutput = document.getElementById('bodyOutput');
    
    const copySubjectBtn = document.getElementById('copySubjectBtn');
    const copyBodyBtn = document.getElementById('copyBodyBtn');
    const mailtoBtn = document.getElementById('mailtoBtn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    // Handle Radio Card Active Visual State
    radioCards.forEach(card => {
        card.addEventListener('click', () => {
            radioCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // Appeal Templates Repository
    const templates = {
        spam: {
            subject: "Request for Review of Temporarily Restricted WhatsApp Account",
            id: (name, phone, emailStr) => 
`Kepada Tim Dukungan WhatsApp,

Melalui surat ini, saya memohon dengan hormat agar Tim WhatsApp berkenan meninjau kembali penangguhan sementara pada akun WhatsApp saya dengan nomor ${phone}.

Saya ingin menyampaikan bahwa saya selalu berusaha mematuhi Syarat Ketentuan dan Kebijakan Layanan WhatsApp. Akun ini merupakan sarana utama saya untuk berinteraksi dengan keluarga serta keperluan profesional harian. Saya tidak pernah bermaksud melakukan pelanggaran, pengiriman pesan massal/spam, maupun penggunaan sistem otomatis tanpa izin.

Apabila terdapat aktivitas tak terduga yang memicu sistem keamanan otomatis WhatsApp, hal tersebut murni terjadi tanpa kesengajaan dari pihak saya. Saya memohon maaf atas ketidaknyamanan yang ditimbulkan.

Mohon bantuan tim untuk melakukan verifikasi ulang dan mengembalikan akses ke akun saya. Saya siap memberikan informasi pendukung jika diperlukan.

Atas waktu, perhatian, dan kerja samanya, saya ucapkan terima kasih banyak.

Hormat saya,
${name}
Nomor WA: ${phone}${emailStr}`,

            en: (name, phone, emailStr) => 
`Dear WhatsApp Support Team,

I am writing to respectfully request a review of my WhatsApp account associated with the phone number ${phone}. My account has recently been temporarily restricted.

I sincerely assure you that I strive to adhere strictly to WhatsApp's Terms of Service and Commerce Policy. I rely on WhatsApp primarily for personal communication and essential daily correspondence. I do not engage in spamming, automated messaging, or sending unsolicited bulk messages.

If my account triggered any automated safety filters, it was completely unintentional. I apologize for any inconvenience caused.

Could you please investigate this matter and consider restoring full access to my account? I am willing to cooperate and verify any required details to resolve this issue.

Thank you very much for your time, assistance, and understanding.

Sincerely,
${name}
Phone: ${phone}${emailStr}`
        },

        permanent: {
            subject: "Request for Review of Permanently Banned WhatsApp Account",
            id: (name, phone, emailStr) => 
`Kepada Tim Dukungan WhatsApp,

Semoga pesan ini menemui Anda dalam keadaan baik. Saya menulis surat ini untuk mengajukan permohonan banding atas pemblokiran permanen pada akun WhatsApp saya dengan nomor terdaftar ${phone}.

Akun WhatsApp ini merupakan sarana komunikasi vital saya untuk kebutuhan keluarga, rekan kerja, dan aktivitas sehari-hari. Saya yakin pemblokiran ini terjadi akibat kekeliruan deteksi sistem otomatis, karena saya tidak pernah dengan sengaja melanggar Syarat Layanan maupun Panduan Komunitas WhatsApp.

Saya sangat menghormati kebijakan dan keamanan yang diterapkan oleh WhatsApp. Oleh karena itu, saya memohon bantuan tim untuk melakukan peninjauan ulang secara manual (manual review) atas status akun saya dan mempertimbangkan pemulihannya.

Jika terdapat kekeliruan penggunaan di masa lalu, saya berkomitmen untuk lebih berhati-hati dan memastikan kepatuhan penuh terhadap seluruh regulasi WhatsApp.

Besar harapan saya agar permohonan banding ini dapat dipertimbangkan. Atas perhatian dan pengertian Bapak/Ibu Tim Dukungan WhatsApp, saya ucapkan terima kasih banyak.

Hormat saya,
${name}
Nomor WA: ${phone}${emailStr}`,

            en: (name, phone, emailStr) => 
`Dear WhatsApp Support Team,

I hope this message finds you well. I am reaching out to formally request an appeal regarding the permanent ban placed on my WhatsApp account registered under ${phone}.

WhatsApp is my primary channel for staying in touch with my family, colleagues, and important daily contacts. I believe the ban on my account may have resulted from an automated detection error, as I have never knowingly violated WhatsApp's Terms of Service or Community Guidelines.

I deeply value the safety and integrity of the WhatsApp platform. I kindly request your support team to manually review my account status and reconsider the ban decision. 

If any unintentional violation occurred, I sincerely apologize and assure you that I am committed to maintaining full compliance with all platform guidelines moving forward.

Thank you for your time and consideration in reviewing my appeal. I look forward to your positive response.

Kind regards,
${name}
Phone: ${phone}${emailStr}`
        }
    };

    // Form Submission Handler
    appealForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const waNumber = waNumberInput.value.trim();
        const email = emailInput.value.trim();
        const lang = languageSelect.value;
        const appealType = document.querySelector('input[name="appealType"]:checked').value;

        // Simple Input Validation
        if (!fullName || !waNumber) {
            showToast('Harap isi Nama Lengkap dan Nomor WhatsApp!');
            return;
        }

        // Format Email String
        const emailStr = email ? `\nEmail: ${email}` : '';

        // Retrieve Template & Generate Text
        const selectedGroup = templates[appealType];
        const subjectText = selectedGroup.subject;
        const bodyText = selectedGroup[lang](fullName, waNumber, emailStr);

        // Render Outputs
        subjectOutput.textContent = subjectText;
        bodyOutput.textContent = bodyText;

        // Configure Mailto Button
        const mailtoUrl = `mailto:support@whatsapp.com?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
        mailtoBtn.setAttribute('href', mailtoUrl);

        // Reveal Result Section with Animation
        emptyState.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // Smooth Scroll to Result on Mobile Devices
        if (window.innerWidth <= 900) {
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Copy to Clipboard Utility Function
    async function copyToClipboard(text, successMessage) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-HTTPS or older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            showToast(successMessage);
        } catch (err) {
            showToast('Gagal menyalin teks.');
        }
    }

    // Event Listeners for Copy Buttons
    copySubjectBtn.addEventListener('click', () => {
        const text = subjectOutput.textContent;
        if (text) copyToClipboard(text, 'Subjek berhasil disalin!');
    });

    copyBodyBtn.addEventListener('click', () => {
        const text = bodyOutput.textContent;
        if (text) copyToClipboard(text, 'Isi surat berhasil disalin!');
    });

    // Toast Notification Timer Logic
    let toastTimeout;
    function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.remove('hidden');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
