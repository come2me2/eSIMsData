/**
 * Default content for FAQ, Privacy, Refund, Terms sections
 * Shared between public and admin APIs
 */

const DEFAULT_CONTENT = {
    faq: `<h2 class="faq-title">FAQ</h2>

<div class="faq-list">
    <div class="faq-item">
        <h3 class="faq-question">What is an eSIM?</h3>
        <p class="faq-answer">An eSIM is a digital SIM card that allows you to activate a mobile data plan without needing a physical SIM card. It's embedded directly into your device and can be set up remotely via QR code.</p>
    </div>
    
    <div class="faq-item">
        <h3 class="faq-question">Which countries does eSimsData operate in?</h3>
        <p class="faq-answer">eSimsData provides reliable mobile connectivity in over 100 countries. Your eSIM will automatically connect to local partner networks while roaming. To see the full list of supported countries, check the Category section on this page.</p>
    </div>
    
    <div class="faq-item">
        <h3 class="faq-question">How do I activate my eSIM?</h3>
        <p class="faq-answer">After purchase, you'll receive a QR code via email or in your account. Simply scan this QR code with your device's camera in the eSIM settings, and your data plan will be activated automatically.</p>
    </div>
    
    <div class="faq-item">
        <h3 class="faq-question">Can I use my eSIM on multiple devices?</h3>
        <p class="faq-answer">No, each eSIM is tied to a single device. If you need connectivity on multiple devices, you'll need to purchase separate eSIMs for each one.</p>
    </div>
</div>`,
    
    privacy: `<h2 class="policy-title">Privacy Policy</h2>

<div class="policy-text">
    <h3 class="policy-section-title">Introduction</h3>
    <p class="policy-paragraph">
        By using esimsdata.com, you agree to the processing of your data in accordance with this Privacy Policy. Please read this document carefully and make sure you fully understand our practices before accessing or using any of our services. If you do not accept this Privacy Policy, you must immediately stop using the website and our services.
    </p>
    
    <h3 class="policy-section-title">Glossary</h3>
    <ul class="policy-list">
        <li class="policy-list-item">
            <strong>User</strong> – an individual or organization using esimsdata.com to perform specific actions.
        </li>
        <li class="policy-list-item">
            <strong>Customer Service</strong> – the support team assisting users and resolving issues related to esimsdata.com.
        </li>
        <li class="policy-list-item">
            <strong>Supplier</strong> – a legal entity providing goods or services to esimsdata.com.
        </li>
        <li class="policy-list-item">
            <strong>Personal Data</strong> – any information directly or indirectly relating to an identifiable user.
        </li>
    </ul>

    <h3 class="policy-section-title">Data Collection</h3>
    <p class="policy-paragraph">
        We collect information you provide directly to us, such as when you create an account, make a purchase, or contact customer support. This may include your name, email address, payment information, and device information.
    </p>
    
    <h3 class="policy-section-title">Data Usage</h3>
    <p class="policy-paragraph">
        We use the collected data to provide, maintain, and improve our services, process transactions, send notifications about your account or orders, and respond to your inquiries.
    </p>
    
    <h3 class="policy-section-title">Data Protection</h3>
    <p class="policy-paragraph">
        We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
    </p>
</div>`,
    
    refund: `<h2 class="policy-title">Refund Policy</h2>

<div class="policy-text">
    <h3 class="policy-section-title">General Policy</h3>
    <p class="policy-paragraph">
        At eSimsData, we strive to provide the best service possible. However, we understand that sometimes things don't work out as planned. This refund policy outlines the circumstances under which refunds may be issued.
    </p>
    
    <h3 class="policy-section-title">Eligibility for Refunds</h3>
    <ul class="policy-list">
        <li class="policy-list-item">
            <strong>Technical Issues:</strong> If you experience technical problems that prevent you from using the eSIM, and our support team cannot resolve the issue, you may be eligible for a refund.
        </li>
        <li class="policy-list-item">
            <strong>Unused eSIMs:</strong> If you haven't activated your eSIM and it's within 24 hours of purchase, you may request a refund.
        </li>
        <li class="policy-list-item">
            <strong>Service Not Available:</strong> If the service is not available in the purchased location despite our coverage claims, you may be eligible for a refund.
        </li>
    </ul>
    
    <h3 class="policy-section-title">Non-Refundable Situations</h3>
    <ul class="policy-list">
        <li class="policy-list-item">eSIMs that have been activated and used</li>
        <li class="policy-list-item">Purchases made more than 24 hours ago (unless due to technical issues)</li>
        <li class="policy-list-item">Data plans that have been partially consumed</li>
    </ul>
    
    <h3 class="policy-section-title">How to Request a Refund</h3>
    <p class="policy-paragraph">
        To request a refund, please contact our customer support team through the Help section with your order details and the reason for your refund request. We'll review your case and respond within 48 hours.
    </p>
    
    <h3 class="policy-section-title">Processing Time</h3>
    <p class="policy-paragraph">
        Approved refunds will be processed within 5-10 business days and credited back to your original payment method.
    </p>
</div>`,
    
    terms: `<h2 class="policy-title">Terms of Service</h2>

<div class="policy-text">
    <h3 class="policy-section-title">Agreement to Terms</h3>
    <p class="policy-paragraph">
        By accessing and using eSimsData services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
    </p>
    
    <h3 class="policy-section-title">Service Description</h3>
    <p class="policy-paragraph">
        eSimsData provides digital cellular connectivity services through eSIM technology. Our services allow you to access mobile data networks in various countries without the need for physical SIM cards.
    </p>
    
    <h3 class="policy-section-title">User Responsibilities</h3>
    <ul class="policy-list">
        <li class="policy-list-item">You must be at least 18 years old to use our services</li>
        <li class="policy-list-item">You are responsible for maintaining the confidentiality of your account</li>
        <li class="policy-list-item">You agree to use our services only for lawful purposes</li>
        <li class="policy-list-item">You must provide accurate and complete information when making purchases</li>
    </ul>
    
    <h3 class="policy-section-title">Service Limitations</h3>
    <p class="policy-paragraph">
        While we strive to provide reliable service, we cannot guarantee uninterrupted access to our services. Network coverage and speeds may vary depending on location and local network conditions.
    </p>
    
    <h3 class="policy-section-title">Payment Terms</h3>
    <p class="policy-paragraph">
        All purchases must be paid in full at the time of order. We accept various payment methods including credit cards, Telegram Stars, and cryptocurrency. Prices are subject to change without notice.
    </p>
    
    <h3 class="policy-section-title">Limitation of Liability</h3>
    <p class="policy-paragraph">
        eSimsData shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of our services.
    </p>
    
    <h3 class="policy-section-title">Changes to Terms</h3>
    <p class="policy-paragraph">
        We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the modified terms.
    </p>
    
    <h3 class="policy-section-title">Contact Information</h3>
    <p class="policy-paragraph">
        If you have any questions about these Terms of Service, please contact us through the Help section of our application.
    </p>
</div>`
};

module.exports = DEFAULT_CONTENT;

