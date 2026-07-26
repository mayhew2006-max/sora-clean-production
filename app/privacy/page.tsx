export default function PrivacyPolicy() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff8f3 0%, #fce9df 100%)",
        color: "#3f302b",
        padding: "40px 18px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <article
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #efd4c5",
          borderRadius: "24px",
          padding: "clamp(24px, 5vw, 52px)",
          boxShadow: "0 18px 50px rgba(120, 76, 55, 0.12)",
          lineHeight: 1.7,
        }}
      >
        <a
          href="/"
          style={{
            color: "#a85f45",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Grace AI
        </a>

        <h1
          style={{
            fontSize: "clamp(34px, 7vw, 52px)",
            marginBottom: "8px",
            color: "#7d4837",
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ color: "#765f56", marginTop: 0 }}>
          <strong>Effective date:</strong> July 26, 2026
        </p>

        <p>
          Grace AI (“Grace,” “we,” “our,” or “us”) respects your privacy. This
          Privacy Policy explains what information may be collected when you
          use the Grace AI website or Android application, how that information
          is used, and the choices available to you.
        </p>

        <Section title="1. Information We Collect">
          <p>Depending on the features you use, we may collect:</p>
          <ul>
            <li>
              <strong>Account information:</strong> such as your email address
              and authentication information when you create or access an
              account.
            </li>
            <li>
              <strong>Conversation content:</strong> messages and prompts you
              submit, and responses generated through Grace.
            </li>
            <li>
              <strong>Voice information:</strong> audio, speech input, or
              transcriptions when you choose to use voice features.
            </li>
            <li>
              <strong>Uploaded content:</strong> photographs, images,
              documents, and PDF files you voluntarily provide for analysis.
            </li>
            <li>
              <strong>Usage and technical information:</strong> such as device
              type, browser information, error logs, feature usage, and basic
              diagnostic data.
            </li>
            <li>
              <strong>Subscription information:</strong> information needed to
              confirm and manage your subscription. Payment processing is
              handled by Stripe. Grace AI does not store your complete payment
              card number.
            </li>
          </ul>
        </Section>

        <Section title="2. How We Use Information">
          <p>We may use information to:</p>
          <ul>
            <li>Provide and operate Grace AI.</li>
            <li>Generate responses to your requests.</li>
            <li>Process images, photographs, documents, and PDFs you submit.</li>
            <li>Provide voice and speech-related features.</li>
            <li>Authenticate users and protect accounts.</li>
            <li>Manage subscriptions and customer support.</li>
            <li>Maintain security, prevent abuse, and troubleshoot problems.</li>
            <li>Improve the reliability and performance of Grace AI.</li>
            <li>Comply with applicable legal obligations.</li>
          </ul>
        </Section>

        <Section title="3. Service Providers">
          <p>
            Grace AI relies on third-party service providers to operate. These
            may include providers for artificial intelligence processing,
            authentication, database storage, website hosting, cloud
            infrastructure, analytics, and payment processing.
          </p>
          <p>
            These providers may process information only as needed to deliver
            their services and are subject to their own privacy and security
            practices.
          </p>
        </Section>

        <Section title="4. How We Share Information">
          <p>
            We do not sell your personal information. We may share information:
          </p>
          <ul>
            <li>With service providers necessary to operate Grace AI.</li>
            <li>When required by law, legal process, or governmental request.</li>
            <li>
              When reasonably necessary to protect users, Grace AI, or the
              public from fraud, abuse, security threats, or unlawful activity.
            </li>
            <li>
              In connection with a business transfer, merger, restructuring, or
              sale of assets, subject to appropriate safeguards.
            </li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain information only for as long as reasonably necessary to
            provide Grace AI, maintain security, comply with legal obligations,
            resolve disputes, and enforce agreements.
          </p>
          <p>
            Retention periods may vary depending on the type of information and
            the services used.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We use reasonable administrative, technical, and organizational
            safeguards designed to protect information. However, no method of
            internet transmission or electronic storage is completely secure,
            and absolute security cannot be guaranteed.
          </p>
        </Section>

        <Section title="7. Your Choices and Rights">
          <p>
            You may request access to, correction of, or deletion of your
            personal information, subject to applicable law and legitimate
            retention requirements.
          </p>
          <p>
            You may stop providing voice input, photographs, documents, or
            other optional content at any time by not using those features.
          </p>
          <p>
            To request account or data deletion, contact us using the email
            address listed below.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Grace AI is not directed to children under 13, and we do not
            knowingly collect personal information from children under 13. If
            we learn that such information was collected, we will take
            reasonable steps to delete it.
          </p>
        </Section>

        <Section title="9. International Processing">
          <p>
            Information may be processed or stored in the United States or
            other countries where our service providers operate. Privacy laws
            in those locations may differ from the laws where you live.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy as Grace AI develops. The updated
            version will be posted on this page with a revised effective date.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            For privacy questions, account deletion, or data requests, contact:
          </p>
          <p>
            <strong>Grace AI Support</strong>
            <br />
            Email:{" "}
            <a
              href="mailto:mayhew2006@gmail.com"
              style={{ color: "#a85f45", fontWeight: 700 }}
            >
              mayhew2006@gmail.com
            </a>
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "34px" }}>
      <h2
        style={{
          color: "#8b4f3b",
          fontSize: "24px",
          marginBottom: "10px",
        }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
