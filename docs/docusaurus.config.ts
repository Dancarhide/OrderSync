import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OrderSync Docs',
  tagline: 'Intelligent Multi-Channel Order Management — ISO 27001:2022 Compliant',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      '@axinom/docusaurus-plugin-papersaurus',
      {
        addDownloadButton: false,
        autoBuildPdfs: false,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          sidebarCollapsible: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OrderSync',
      logo: {
        alt: 'OrderSync Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/docs',
          position: 'left',
          label: 'Overview',
        },
        {
          to: '/docs/en/architecture',
          position: 'left',
          label: 'English Docs',
        },
        {
          to: '/docs/es/architecture',
          position: 'left',
          label: 'Documentación en Español',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'English Documentation',
          items: [
            { label: 'Overview', to: '/docs' },
            { label: 'System Architecture', to: '/docs/en/architecture' },
            { label: 'Security & Compliance', to: '/docs/en/security' },
            { label: 'Enterprise Management', to: '/docs/en/management-modules' },
            { label: 'Autonomous Logistics', to: '/docs/en/logistics-engine' },
            { label: 'Executive BI & Metrics', to: '/docs/en/business-intelligence' },
            { label: 'API Reference', to: '/docs/en/api' },
            { label: 'DevOps & Deployment', to: '/docs/en/devops' },
          ],
        },
        {
          title: 'Documentación en Español',
          items: [
            { label: 'Inicio y Visión General', to: '/docs' },
            { label: 'Arquitectura del Sistema', to: '/docs/es/architecture' },
            { label: 'Seguridad y Cumplimiento', to: '/docs/es/security' },
            { label: 'Gestión Empresarial', to: '/docs/es/management-modules' },
            { label: 'Motor Logístico Autónomo', to: '/docs/es/logistics-engine' },
            { label: 'BI Ejecutivo y Métricas', to: '/docs/es/business-intelligence' },
            { label: 'Referencia de API', to: '/docs/es/api' },
            { label: 'DevOps y Despliegue', to: '/docs/es/devops' },
          ],
        },
        {
          title: 'Standards & Compliance',
          items: [
            { label: 'ISO 27001:2022', href: 'https://www.iso.org/standard/82875.html' },
            { label: 'CCPA', href: 'https://oag.ca.gov/privacy/ccpa' },
            { label: 'OWASP Top 10', href: 'https://owasp.org/Top10/' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OrderSync — Houston, TX. ISO 27001:2022 Compliant. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
