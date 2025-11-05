"use client";

import React from "react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,rgb(13, 40, 70) 0%,rgb(41, 68, 119) 50%,rgb(130, 156, 186) 100%)',
      color: '#f3f6fb',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem'
    }}>
      
      {/* Logo GMBS */}
      <motion.div
        style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#3371B2',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          marginBottom: '2rem'
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
      >
        GMBS
      </motion.div>

      {/* Titre principal */}
      <motion.h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '1rem',
          maxWidth: '800px'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        CRM Gestion Multi-Bâtiments et Services
      </motion.h1>

      {/* Sous-titre */}
      <motion.p
        style={{
          fontSize: '1.2rem',
          textAlign: 'center',
          marginBottom: '3rem',
          maxWidth: '600px',
          opacity: 0.9
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        Solution complète de gestion pour les artisans et gestionnaires de bâtiments
      </motion.p>

      {/* Boutons d'action */}
      <motion.div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.9 }}
      >
        <motion.button
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(180deg, #11305f, #0a2244)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#e9eefb',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          Se connecter
        </motion.button>

        <motion.button
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#e9eefb',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          En savoir plus
        </motion.button>
      </motion.div>

      {/* Fonctionnalités */}
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginTop: '4rem',
          maxWidth: '1000px',
          width: '100%'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
      >
        {[
          {
            title: "Gestion des Interventions",
            description: "Suivi complet des interventions et maintenance"
          },
          {
            title: "Gestion des Artisans",
            description: "Base de données des artisans et prestataires"
          },
          {
            title: "Tableau de Bord",
            description: "Vue d'ensemble et analytics en temps réel"
          },
          {
            title: "Intégrations",
            description: "Connexion avec vos outils existants"
          }
        ].map((feature, index) => (
          <motion.div
            key={index}
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {feature.title}
            </h3>
            <p style={{ opacity: 0.8, lineHeight: '1.5' }}>
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
