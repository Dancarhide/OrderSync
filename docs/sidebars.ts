import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Overview / Inicio',
    },
    {
      type: 'category',
      label: 'English Documentation',
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'en/architecture',
          label: 'System Architecture',
        },
        {
          type: 'doc',
          id: 'en/security',
          label: 'Security & Compliance',
        },
        {
          type: 'doc',
          id: 'en/management-modules',
          label: 'Enterprise Management (ERP/OMS)',
        },
        {
          type: 'doc',
          id: 'en/logistics-engine',
          label: 'Autonomous Logistics Engine',
        },
        {
          type: 'doc',
          id: 'en/business-intelligence',
          label: 'Executive BI & Metrics',
        },
        {
          type: 'doc',
          id: 'en/api',
          label: 'API & Webhooks Reference',
        },
        {
          type: 'doc',
          id: 'en/devops',
          label: 'DevOps & Deployment',
        },
      ],
    },
    {
      type: 'category',
      label: 'Documentación en Español',
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'es/architecture',
          label: 'Arquitectura del Sistema',
        },
        {
          type: 'doc',
          id: 'es/security',
          label: 'Seguridad y Cumplimiento',
        },
        {
          type: 'doc',
          id: 'es/management-modules',
          label: 'Gestión Empresarial (ERP/OMS)',
        },
        {
          type: 'doc',
          id: 'es/logistics-engine',
          label: 'Motor Logístico Autónomo',
        },
        {
          type: 'doc',
          id: 'es/business-intelligence',
          label: 'BI Ejecutivo y Métricas',
        },
        {
          type: 'doc',
          id: 'es/api',
          label: 'Referencia de API y Webhooks',
        },
        {
          type: 'doc',
          id: 'es/devops',
          label: 'DevOps y Despliegue',
        },
      ],
    },
  ],
};

export default sidebars;
