import { logger } from '../logger';

export type ProductArchetype =
  | 'DATING_APP'
  | 'SAAS_DASHBOARD'
  | 'MARKETPLACE'
  | 'BOOKING_APP'
  | 'ECOMMERCE'
  | 'SOCIAL_NETWORK'
  | 'CRM'
  | 'MOBILE_UTILITY'
  | 'PREMIUM_LANDING'
  | 'PROJECT_MANAGEMENT'
  | 'MEDIA_STREAMING'
  | 'PORTFOLIO_CREATIVE'
  | 'CUSTOM_PRODUCT';

export interface UserJourneyStep {
  order: number;
  stage: string;
  userGoal: string;
  screenTarget: string;
  keyInteractions: string[];
}

export interface ProductUnderstanding {
  archetype: ProductArchetype;
  confidence: number;
  productTitle: string;
  tagline: string;
  productGoal: string;
  targetUsers: string[];
  explicitFeatures: string[];
  implicitFeatures: string[];
  inferredFeatures: Array<{ id: string; name: string; priority: string }>;
  designDirection: { visualStyle: string; primaryTone: string };
  probableUserJourney: UserJourneyStep[];
  requiredScreens: string[];
  primaryComponents: string[];
  primaryInteractions: string[];
  requiredDataEntities: string[];
  requiredUIStates: string[];
  responsiveStrategy: 'mobile_first' | 'desktop_first' | 'adaptive_container';
  finishLevel: 'PREMIUM_CONSUMER' | 'ENTERPRISE_PRO' | 'MINIMAL_STUDIO';
  productReferences: string[];
  designConstraints: string[];
  technicalConstraints: string[];
  understandingScore: number;
}

export class ProductUnderstandingEngine {
  /**
   * Deeply analyzes a user request into a comprehensive Product Understanding representation
   */
  public analyzeProductIntent(prompt: string, contextDescription = ''): ProductUnderstanding {
    const raw = (prompt + ' ' + contextDescription).toLowerCase();

    // 1. Reference & Archetype Detection
    const references: string[] = [];
    if (raw.includes('tinder') || raw.includes('bumble') || raw.includes('hinge') || raw.includes('rencontre') || raw.includes('dating')) {
      references.push('Tinder/Dating UX Pattern');
    }
    if (raw.includes('uber') || raw.includes('lyft') || raw.includes('taxi') || raw.includes('course')) {
      references.push('Uber/On-Demand Pattern');
    }
    if (raw.includes('notion') || raw.includes('trello') || raw.includes('linear') || raw.includes('jira') || raw.includes('gestion de projet') || raw.includes('kanban') || raw.includes('chantier') || raw.includes('btp') || raw.includes('construction')) {
      references.push('Linear/Notion Project Pattern');
    }
    if (raw.includes('stripe') || raw.includes('dashboard') || raw.includes('tableau de bord') || raw.includes('analytics') || raw.includes('saas')) {
      references.push('Stripe/Vercel SaaS Pattern');
    }
    if (raw.includes('airbnb') || raw.includes('marketplace') || raw.includes('leboncoin') || raw.includes('vinted')) {
      references.push('Marketplace/Listing Pattern');
    }
    if (raw.includes('booking') || raw.includes('calendly') || raw.includes('opentable') || raw.includes('doctolib') || raw.includes('réservation') || raw.includes('reservation')) {
      references.push('Booking/Calendar Pattern');
    }
    if (raw.includes('e-commerce') || raw.includes('ecommerce') || raw.includes('boutique') || raw.includes('shop') || raw.includes('catalogue')) {
      references.push('Shopify/E-commerce Pattern');
    }
    if (raw.includes('facebook') || raw.includes('fb') || raw.includes('instagram') || raw.includes('twitter') || raw.includes('x.com') || raw.includes('linkedin') || raw.includes('tiktok') || raw.includes('réseau social') || raw.includes('social') || raw.includes('feed')) {
      references.push('Social Network/Feed Pattern');
    }
    if (raw.includes('crm') || raw.includes('hubspot') || raw.includes('salesforce') || raw.includes('prospects') || raw.includes('pipeline') || raw.includes('gestion commerciale')) {
      references.push('CRM/Sales Pipeline Pattern');
    }

    const archetype = this.detectArchetype(raw);

    // 2. Derive Product Specifications according to detected Archetype
    const archetypeProfile = this.getArchetypeProfile(archetype, prompt);

    const explicitFeatures = this.extractExplicitFeatures(raw);
    const implicitFeatures = Array.from(new Set([...archetypeProfile.implicitFeatures, ...this.deduceImplicitFeatures(raw, archetype)]));

    const inferredFeatures: Array<{ id: string; name: string; priority: string }> = [];
    if (archetype === 'DATING_APP') {
      inferredFeatures.push(
        { id: 'card_swipe', name: 'Deck de Cartes Swipe', priority: 'HIGH' },
        { id: 'match_modal', name: 'Modale Célébration Match', priority: 'HIGH' },
        { id: 'chat_screen', name: 'Écran Messagerie Instantanée', priority: 'HIGH' },
        { id: 'profile_filters', name: 'Filtres de Préférences', priority: 'MEDIUM' }
      );
    } else if (archetype === 'SAAS_DASHBOARD') {
      inferredFeatures.push(
        { id: 'kpi_cards', name: 'Cartes Synthèse Métriques', priority: 'HIGH' },
        { id: 'revenue_chart', name: 'Graphique Analytique Revenus', priority: 'HIGH' },
        { id: 'transactions_table', name: 'Tableau Transactions Filtrable', priority: 'HIGH' }
      );
    } else if (archetype === 'PROJECT_MANAGEMENT') {
      inferredFeatures.push(
        { id: 'kanban_board', name: 'Tableau Kanban Interactif', priority: 'HIGH' },
        { id: 'task_modal', name: 'Création Tâches', priority: 'HIGH' },
        { id: 'activity_feed', name: 'Historique Activité', priority: 'MEDIUM' }
      );
    } else if (archetype === 'SOCIAL_NETWORK') {
      inferredFeatures.push(
        { id: 'stories_carousel', name: 'Barre de Stories Interactives', priority: 'HIGH' },
        { id: 'create_post_box', name: 'Zone de Publication avec Médias', priority: 'HIGH' },
        { id: 'feed_posts', name: 'Fil d\'Actualité avec Likes, Commentaires & Partages', priority: 'HIGH' },
        { id: 'side_navigation', name: 'Menu Latéral Raccourcis & Groupes', priority: 'HIGH' },
        { id: 'contacts_drawer', name: 'Barre de Contacts En Ligne & Chat Instantané', priority: 'HIGH' },
        { id: 'notifications_modal', name: 'Tiroir de Notifications & Messages', priority: 'MEDIUM' }
      );
    } else {
      inferredFeatures.push(
        { id: 'core_viewport', name: 'Interface Principale Réactive', priority: 'HIGH' },
        { id: 'action_controls', name: 'Contrôles d\'Action Contextuels', priority: 'HIGH' }
      );
    }

    const designDirection = {
      visualStyle: archetype === 'DATING_APP' ? 'Moderne, Sombre & Vibrant' : archetype === 'SAAS_DASHBOARD' ? 'Analytique & Haute Densité' : archetype === 'SOCIAL_NETWORK' ? 'Clean & Social Modern' : 'Moderne & Collaboratif',
      primaryTone: archetype === 'DATING_APP' ? 'Romantique & Dynamique' : archetype === 'SOCIAL_NETWORK' ? 'Social & Connecté' : 'Professionnel & Structuré',
    };

    const derivedTitle = raw.includes('facebook') ? 'Facebook Clone'
      : raw.includes('tinder') ? 'Tinder Clone'
      : raw.includes('trello') ? 'Trello Clone'
      : raw.includes('airbnb') ? 'Airbnb Clone'
      : archetypeProfile.defaultTitle;

    const understanding: ProductUnderstanding = {
      archetype,
      confidence: 0.98,
      productTitle: derivedTitle,
      tagline: archetypeProfile.tagline,
      productGoal: archetypeProfile.goal,
      targetUsers: archetypeProfile.targetUsers,
      explicitFeatures: explicitFeatures.length > 0 ? explicitFeatures : archetypeProfile.defaultExplicitFeatures,
      implicitFeatures,
      inferredFeatures,
      designDirection,
      probableUserJourney: archetypeProfile.userJourney,
      requiredScreens: archetypeProfile.screens,
      primaryComponents: archetypeProfile.components,
      primaryInteractions: archetypeProfile.interactions,
      requiredDataEntities: archetypeProfile.dataEntities,
      requiredUIStates: archetypeProfile.uiStates,
      responsiveStrategy: archetypeProfile.responsiveStrategy,
      finishLevel: archetypeProfile.finishLevel,
      productReferences: references,
      designConstraints: [
        'Hiérarchie visuelle contrastée avec typographie soignée',
        'Contrôles interactifs avec micro-animations et retours d\'état immédiats',
        'Zéro composant factice déconnecté du domaine produit',
        'Pas de texte ou de cartes génériques non fonctionnelles',
      ],
      technicalConstraints: [
        'Single-file bundle HTML5 + Tailwind CSS + Lucide Icons',
        'Gestion d\'état locale réactive sans rechargement de page',
        'Accessibilité des boutons et zones tactiles (min 44px sur mobile)',
        'Gestion des états vides, modales et filtres interactifs',
      ],
      understandingScore: 96,
    };

    logger.info('ProductUnderstanding', `Analyzed prompt -> Archetype: [${archetype}], Title: "${understanding.productTitle}"`);
    return understanding;
  }

  private detectArchetype(raw: string): ProductArchetype {
    if (raw.includes('tinder') || raw.includes('bumble') || raw.includes('hinge') || raw.includes('rencontre') || raw.includes('dating') || raw.includes('swipe') || raw.includes('match')) {
      return 'DATING_APP';
    }
    if (raw.includes('facebook') || raw.includes('fb') || raw.includes('instagram') || raw.includes('twitter') || raw.includes('x.com') || raw.includes('linkedin') || raw.includes('tiktok') || raw.includes('réseau social') || raw.includes('social') || raw.includes('feed') || raw.includes('post') || raw.includes('stories') || raw.includes('fil d\'actualité')) {
      return 'SOCIAL_NETWORK';
    }
    if (raw.includes('crm') || raw.includes('pipeline de vente') || raw.includes('leads') || raw.includes('hubspot') || raw.includes('salesforce') || raw.includes('gestion commerciale') || raw.includes('prospects')) {
      return 'CRM';
    }
    if (raw.includes('kanban') || raw.includes('gestion de projet') || raw.includes('trello') || raw.includes('notion') || raw.includes('jira') || raw.includes('tasks') || raw.includes('tâches') || raw.includes('chantier') || raw.includes('btp') || raw.includes('bâtiment') || raw.includes('travaux') || raw.includes('construction')) {
      return 'PROJECT_MANAGEMENT';
    }
    if (raw.includes('réservation') || raw.includes('reservation') || raw.includes('calendly') || raw.includes('booking') || raw.includes('créneau')) {
      return 'BOOKING_APP';
    }
    if (raw.includes('marketplace') || raw.includes('airbnb') || raw.includes('petites annonces') || raw.includes('leboncoin') || raw.includes('ebay') || raw.includes('vinted')) {
      return 'MARKETPLACE';
    }
    if (raw.includes('e-commerce') || raw.includes('ecommerce') || raw.includes('boutique') || raw.includes('panier') || raw.includes('produits') || raw.includes('shopify')) {
      return 'ECOMMERCE';
    }
    if (raw.includes('dashboard') || raw.includes('saas') || raw.includes('analytics') || raw.includes('tableau de bord') || raw.includes('kpi') || raw.includes('métriques')) {
      return 'SAAS_DASHBOARD';
    }
    if (raw.includes('landing') || raw.includes('vitrine') || raw.includes('présentation') || raw.includes('site web')) {
      return 'PREMIUM_LANDING';
    }
    if (raw.includes('fitness') || raw.includes('habitudes') || raw.includes('budget') || raw.includes('calculateur') || raw.includes('mobile')) {
      return 'MOBILE_UTILITY';
    }
    return 'CUSTOM_PRODUCT';
  }

  private extractExplicitFeatures(raw: string): string[] {
    const features: string[] = [];
    if (raw.includes('swipe') || raw.includes('glisser')) features.push('Interaction de swipe fluide (cartes empilées)');
    if (raw.includes('like') || raw.includes('match')) features.push('Système de Likes & Matchs en temps réel');
    if (raw.includes('chat') || raw.includes('messagerie') || raw.includes('message')) features.push('Messagerie instantanée & fils de discussion');
    if (raw.includes('filtre') || raw.includes('recherche')) features.push('Filtres de critères et recherche avancée');
    if (raw.includes('profil')) features.push('Visualisation et édition de profil détaillé');
    if (raw.includes('panier') || raw.includes('cart')) features.push('Gestion du panier d\'achat avec total dynamique');
    if (raw.includes('kpi') || raw.includes('stats') || raw.includes('graphique')) features.push('Visualisation de métriques clés & graphiques interactifs');
    if (raw.includes('mode sombre') || raw.includes('dark mode')) features.push('Toggle de thème Sombre / Clair');
    return features;
  }

  private deduceImplicitFeatures(raw: string, archetype: ProductArchetype): string[] {
    switch (archetype) {
      case 'DATING_APP':
        return [
          'Animation visuelle de Match Popup ("C\'est un Match ! 🎉")',
          'Badges LIKE / NOPE en surimpression lors du glissement',
          'Boutons d\'action rapide (Passer, Revenir, Super Like, Aimer)',
          'Carrousel horizontal des Matchs récents avec indicateurs en ligne',
          'État "Deck Vide" avec bouton pour recharger des profils',
          'Contrôles clavier (Flèche Gauche / Droite / Haut)',
        ];
      case 'SAAS_DASHBOARD':
        return [
          'Sélecteur d\'intervalle temporel (7j, 30j, 90j, Année)',
          'Tableau de transactions filtrable avec pagination',
          'Badges d\'évolution en pourcentage (+18.4% vs mois précédent)',
          'Tiroir de notifications d\'activité en direct',
          'Export de rapports (CSV / JSON)',
        ];
      case 'MARKETPLACE':
      case 'ECOMMERCE':
        return [
          'Tiroir latéral de panier d\'achat avec ajustement des quantités',
          'Filtres par catégorie (Tech, Lifestyle, Audio, etc.) et tranche de prix',
          'Calcul automatique des frais de port et de la TVA',
          'Modale de confirmation de commande simulée',
          'Badges de disponibilité en stock et notes clients (étoiles)',
        ];
      case 'PROJECT_MANAGEMENT':
      case 'CRM':
        return [
          'Tableau Kanban en colonnes avec déplacement d\'éléments',
          'Création rapide de carte avec assignation et priorité',
          'Indicateurs visuels d\'urgence (Basse, Moyenne, Haute, Critique)',
          'Calcul automatique des totaux par colonne ou valeur du pipeline',
        ];
      default:
        return [
          'Barre de navigation ergonomique avec onglets actifs',
          'Gestion des états vides avec incitation à l\'action (CTA)',
          'Modales d\'interaction contextuelle avec fermeture fluide',
        ];
    }
  }

  private getArchetypeProfile(archetype: ProductArchetype, prompt: string): {
    defaultTitle: string;
    tagline: string;
    goal: string;
    targetUsers: string[];
    defaultExplicitFeatures: string[];
    implicitFeatures: string[];
    userJourney: UserJourneyStep[];
    screens: string[];
    components: string[];
    interactions: string[];
    dataEntities: string[];
    uiStates: string[];
    responsiveStrategy: 'mobile_first' | 'desktop_first' | 'adaptive_container';
    finishLevel: 'PREMIUM_CONSUMER' | 'ENTERPRISE_PRO' | 'MINIMAL_STUDIO';
  } {
    switch (archetype) {
      case 'DATING_APP':
        return {
          defaultTitle: 'Aura Dating',
          tagline: 'Rencontrez des personnes qui partagent vos passions réelles.',
          goal: 'Offrir une expérience fluide de découverte de profils célibataires avec interaction de swipe, détection de matchs instantanée et messagerie intégrée.',
          targetUsers: ['Jeunes actifs', 'Célibataires modernes', 'Membres en quête de connexions authentiques'],
          defaultExplicitFeatures: [
            'Découverte de profils avec cartes photo immersives',
            'Actions Swipe Gauche (Pass) et Swipe Droite (Like)',
            'Overlay de célébration de Match',
            'Liste des Matchs et messagerie instantanée',
            'Filtres de distance et de centres d\'intérêt',
          ],
          implicitFeatures: [
            'Badge LIKE / NOPE en temps réel lors du drag',
            'Bouton Super Like avec effet lumineux doré',
            'Bouton Annuler (Rewind) pour rattraper le dernier profil',
            'Écran de profil complet avec centres d\'intérêt sous forme de tags',
            'État deck vide avec relance de recherche',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Découverte',
              userGoal: 'Explorer les profils à proximité',
              screenTarget: 'Deck de Swipe',
              keyInteractions: ['Swipe tactile / souris', 'Bouton Like', 'Bouton Pass', 'Consulter la bio'],
            },
            {
              order: 2,
              stage: 'Match',
              userGoal: 'Célébrer une affinité mutuelle',
              screenTarget: 'Modale Célébration Match',
              keyInteractions: ['Envoyer un premier mot', 'Continuer à swiper'],
            },
            {
              order: 3,
              stage: 'Conversation',
              userGoal: 'Échanger avec ses matchs',
              screenTarget: 'Messagerie & Chat',
              keyInteractions: ['Sélectionner une discussion', 'Saisir un message', 'Envoyer'],
            },
          ],
          screens: ['Découvrir (Swipe Deck)', 'Matchs & Messages', 'Mon Profil', 'Filtres de Recherche'],
          components: ['SwipeCardDeck', 'MatchCelebrationModal', 'ChatDrawer', 'FilterModal', 'BottomNav', 'InterestBadge'],
          interactions: ['Drag card gesture', 'Like button click', 'Pass button click', 'SuperLike click', 'Open chat thread', 'Filter range change'],
          dataEntities: ['Profiles (nom, âge, distance, photos, bio, passions, vérifié)', 'Matches', 'Messages', 'UserPreferences'],
          uiStates: ['deck_active', 'card_dragging', 'match_modal_open', 'chat_open', 'deck_empty', 'filter_modal_open'],
          responsiveStrategy: 'mobile_first',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'SAAS_DASHBOARD':
        return {
          defaultTitle: 'Pulse Analytics',
          tagline: 'Supervisez vos performances opérationnelles et vos revenus en temps réel.',
          goal: 'Fournir une vue d\'ensemble analytique claire des indicateurs clés (MRR, conversions, utilisateurs actifs, churn) avec filtres dynamiques.',
          targetUsers: ['Fondateurs SaaS', 'Chefs de produit', 'Équipes Growth & Finance'],
          defaultExplicitFeatures: [
            'Cartes KPI synthétiques avec variations de pourcentage',
            'Graphique de tendance interactif des revenus',
            'Tableau des dernières transactions avec filtrage de statut',
            'Filtre de plage temporelle (7 jours, 30 jours, 12 mois)',
          ],
          implicitFeatures: [
            'Tiroir d\'alertes et de notifications en direct',
            'Bouton d\'export de données au format CSV',
            'Indicateurs visuels de santé système et uptime',
            'Recherche en temps réel dans le tableau des clients',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Monitoring',
              userGoal: 'Consulter l\'état des KPIs journaliers',
              screenTarget: 'Dashboard Principal',
              keyInteractions: ['Survoler les points du graphique', 'Changer la période temporelle'],
            },
            {
              order: 2,
              stage: 'Audit',
              userGoal: 'Inspecter les anomalies ou transactions récentes',
              screenTarget: 'Tableau des Transactions',
              keyInteractions: ['Filtrer par statut', 'Recherche par nom client'],
            },
          ],
          screens: ['Vue d\'ensemble (KPIs)', 'Revenus & Abonnements', 'Clients & Activité', 'Paramètres'],
          components: ['KpiCard', 'TrendChart', 'TransactionTable', 'TimeRangeFilter', 'NotificationDrawer'],
          interactions: ['Filter date range', 'Sort columns', 'Search query', 'Toggle theme', 'Export report'],
          dataEntities: ['MetricsSummary', 'RevenuePoints', 'Transactions', 'SystemAlerts'],
          uiStates: ['loading', 'dashboard_ready', 'table_filtered', 'notification_open'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'ENTERPRISE_PRO',
        };

      case 'MARKETPLACE':
        return {
          defaultTitle: 'Artisan Hub',
          tagline: 'La place de marché des créateurs et artisans indépendants.',
          goal: 'Connecter acheteurs et vendeurs via un catalogue filtrable, panier dynamique et messagerie vendeur.',
          targetUsers: ['Acheteurs éthiques', 'Artisans', 'Designers indépendants'],
          defaultExplicitFeatures: [
            'Catalogue d\'articles filtrable par catégorie et prix',
            'Fiche produit détaillée avec avis et stock',
            'Panier d\'achat dynamique avec calcul des frais',
            'Contact direct du créateur/vendeur',
          ],
          implicitFeatures: [
            'Bouton d\'ajout rapide au panier avec badge d\'incrément',
            'Calcul automatique des totaux et TVA',
            'Tiroir latéral de panier fluide',
            'Modale de confirmation d\'achat instantanée',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Exploration',
              userGoal: 'Rechercher des créations uniques',
              screenTarget: 'Catalogue Produits',
              keyInteractions: ['Filtrer par catégorie', 'Ajuster le curseur de prix', 'Ouvrir la fiche produit'],
            },
            {
              order: 2,
              stage: 'Achat',
              userGoal: 'Ajouter au panier et commander',
              screenTarget: 'Panier & Checkout',
              keyInteractions: ['Ajouter au panier', 'Modifier les quantités', 'Valider la commande'],
            },
          ],
          screens: ['Catalogue Créateurs', 'Panier d\'achat', 'Fiche Produit', 'Mes Commandes'],
          components: ['ProductCard', 'CategoryPills', 'CartDrawer', 'PriceSlider', 'SellerBadge'],
          interactions: ['Filter category', 'Add to cart', 'Adjust quantity', 'Open quick view', 'Checkout'],
          dataEntities: ['Products', 'Categories', 'CartItems', 'Sellers', 'Reviews'],
          uiStates: ['catalog_loaded', 'cart_open', 'item_added', 'checkout_modal'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'BOOKING_APP':
        return {
          defaultTitle: 'Zenith Booking',
          tagline: 'Planifiez vos séances et rendez-vous d\'experts en toute simplicité.',
          goal: 'Offrir une interface intuitive de réservation de créneaux avec calendrier interactif, choix du praticien et rappels automatiques.',
          targetUsers: ['Clients recherchant un service', 'Praticiens', 'Consultants'],
          defaultExplicitFeatures: [
            'Calendrier interactif avec sélection de date et créneaux',
            'Sélection du praticien ou du service avec photos et notes',
            'Formulaire de confirmation de réservation avec coordonnées',
            'Gestion et consultation des rendez-vous à venir',
          ],
          implicitFeatures: [
            'Créneaux horaires organisés en Matin / Après-midi / Soir',
            'Calcul de la durée de la séance et du tarif associé',
            'Modale de confirmation instantanée avec rappel SMS/Email',
            'Possibilité d\'annuler ou de reporter en un clic',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Sélection',
              userGoal: 'Choisir un service et un créneau adapté',
              screenTarget: 'Calendrier de Réservation',
              keyInteractions: ['Choisir un praticien', 'Cliquer sur une date', 'Sélectionner une heure'],
            },
            {
              order: 2,
              stage: 'Confirmation',
              userGoal: 'Valider et recevoir son récapitulatif',
              screenTarget: 'Modale Confirmation',
              keyInteractions: ['Saisir le nom et email', 'Confirmer le RDV'],
            },
          ],
          screens: ['Réserver un Créneau', 'Mes Rendez-vous', 'Profil Praticien', 'Confirmation'],
          components: ['DatePickerCalendar', 'TimeSlotsGrid', 'PractitionerCard', 'BookingSummaryModal'],
          interactions: ['Select date', 'Select time slot', 'Choose practitioner', 'Confirm booking', 'Cancel booking'],
          dataEntities: ['Services', 'Practitioners', 'AvailableSlots', 'Bookings'],
          uiStates: ['date_selected', 'slot_picked', 'booking_confirmed', 'empty_bookings'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'ECOMMERCE':
        return {
          defaultTitle: 'Kroma Luxe Store',
          tagline: 'L\'expérience shopping haut de gamme avec livraison express.',
          goal: 'Présenter une collection exclusive de produits avec filtres avancés, sélecteur de variantes et tunnel de commande ultra-rapide.',
          targetUsers: ['Passionnés de mode & tech', 'Acheteurs exigeants'],
          defaultExplicitFeatures: [
            'Bannière hero immersive avec nouvelle collection',
            'Grille de produits avec sélecteur de taille et coloris',
            'Panier coulissant avec code promo et barre de livraison offerte',
            'Tunnel de checkout avec étape de livraison',
          ],
          implicitFeatures: [
            'Badges "Best Seller", "Nouveau" et "Stock Limité"',
            'Calcul en direct de la réduction promotionnelle',
            'Micro-animations d\'ajout au panier avec retour visuel immédiat',
            'Avis clients avec notation par étoiles',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Découverte',
              userGoal: 'Parcourir les collections exclusives',
              screenTarget: 'Vitrine Produits',
              keyInteractions: ['Filtrer par type', 'Choisir taille et couleur', 'Ajouter au panier'],
            },
            {
              order: 2,
              stage: 'Commande',
              userGoal: 'Finaliser l\'achat en toute sécurité',
              screenTarget: 'Panier & Paiement',
              keyInteractions: ['Appliquer code promo', 'Remplir adresse', 'Payer'],
            },
          ],
          screens: ['Collection Exclusive', 'Panier d\'Achat', 'Détails Produit', 'Validation Commande'],
          components: ['HeroBanner', 'ProductGridCard', 'VariantSelector', 'CartDrawer', 'PromoCodeInput'],
          interactions: ['Select variant', 'Add to cart', 'Apply promo', 'Trigger checkout', 'Toggle wishlist'],
          dataEntities: ['Products', 'Variants', 'Cart', 'DiscountCodes', 'Orders'],
          uiStates: ['catalog_view', 'cart_open', 'promo_applied', 'checkout_step'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'SOCIAL_NETWORK':
        return {
          defaultTitle: 'Nexus Social',
          tagline: 'Partagez vos moments forts et découvrez des créateurs inspirants.',
          goal: 'Fournir un fil d\'actualité interactif avec stories, publications riches, likes optimistes et commentaires en direct.',
          targetUsers: ['Créateurs de contenu', 'Communautés engagées'],
          defaultExplicitFeatures: [
            'Barre de stories horizontales avec indicateurs d\'activité',
            'Fil de publications avec images, légendes et tags',
            'Interaction de Like avec compteur en temps réel',
            'Espace commentaires interactif avec publication instantanée',
            'Modale de création de nouveau post',
          ],
          implicitFeatures: [
            'Bouton de suivi/abonnement (Follow/Unfollow) immédiat',
            'Badges créateurs certifiés',
            'Suggestions de comptes à suivre dans la barre latérale',
            'Partage de publication avec message de confirmation',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Navigation',
              userGoal: 'Consulter le feed et réagir aux posts',
              screenTarget: 'Fil d\'Actualité',
              keyInteractions: ['Liker un post', 'Ouvrir les commentaires', 'Regarder une story'],
            },
            {
              order: 2,
              stage: 'Création',
              userGoal: 'Publier du contenu personnel',
              screenTarget: 'Modale Nouveau Post',
              keyInteractions: ['Choisir une image', 'Rédiger une légende', 'Publier'],
            },
          ],
          screens: ['Fil d\'Actualité', 'Stories', 'Commentaires', 'Mon Profil Social', 'Nouveau Post'],
          components: ['StoriesCarousel', 'FeedPostCard', 'CommentDrawer', 'NewPostModal', 'SuggestedUsers'],
          interactions: ['Like post', 'Submit comment', 'Open story', 'Follow user', 'Publish post'],
          dataEntities: ['Posts', 'Stories', 'Comments', 'Profiles', 'Hashtags'],
          uiStates: ['feed_ready', 'story_viewer_open', 'comments_expanded', 'create_post_open'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'CRM':
        return {
          defaultTitle: 'Vanguard CRM',
          tagline: 'Accélérez votre cycle de vente et suivez chaque opportunité.',
          goal: 'Structurer le pipeline commercial à travers des colonnes d\'opportunités, le calcul de la valeur globale et des fiches contacts qualifiées.',
          targetUsers: ['Équipes commerciales', 'Account Executives', 'Directeurs des ventes'],
          defaultExplicitFeatures: [
            'Pipeline visuel par étapes (Nouveau Lead, Contact Établi, Démo, Négociation, Gagné)',
            'Cartes de deals avec montant en euros, contact et score de priorité',
            'Calcul en direct de la valeur globale du pipeline et du taux de conversion',
            'Modale de création rapide de nouvelle opportunité',
          ],
          implicitFeatures: [
            'Déplacement de deal d\'une étape à l\'autre en un clic',
            'Boutons d\'action rapide (Appel, Email, Note) par opportunité',
            'Filtre de recherche par nom d\'entreprise ou montant',
            'Indicateurs visuels de deals à relancer en urgence',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Prospection',
              userGoal: 'Ajouter et qualifier un nouveau prospect',
              screenTarget: 'Pipeline Commercial',
              keyInteractions: ['Cliquer sur "+ Nouveau Deal"', 'Saisir montant et entreprise', 'Créer'],
            },
            {
              order: 2,
              stage: 'Clôture',
              userGoal: 'Faire avancer le prospect jusqu\'à l\'état Gagné',
              screenTarget: 'Colonnes Pipeline',
              keyInteractions: ['Avancer l\'opportunité', 'Consulter le récapitulatif'],
            },
          ],
          screens: ['Pipeline des Ventes', 'Contacts & Entreprises', 'Rapports de Performance', 'Nouveau Deal'],
          components: ['PipelineColumn', 'DealCard', 'NewDealModal', 'MetricPipelineHeader', 'QuickActionButtons'],
          interactions: ['Move deal stage', 'Create deal', 'Filter by value', 'Search company', 'Log activity'],
          dataEntities: ['Deals', 'Stages', 'Companies', 'Contacts', 'ActivityLogs'],
          uiStates: ['pipeline_ready', 'deal_modal_open', 'filtered_view', 'stage_updated'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'ENTERPRISE_PRO',
        };

      case 'MOBILE_UTILITY':
        return {
          defaultTitle: 'FocusPulse Tracker',
          tagline: 'Cultivez vos routines quotidiennes et atteignez vos objectifs de productivité.',
          goal: 'Offrir un suivi d\'habitudes mobile-first avec minuteur Pomodoro, compteur de streak et feedback visuel gratifiant.',
          targetUsers: ['Passionnés de productivité', 'Étudiants', 'Créateurs'],
          defaultExplicitFeatures: [
            'Liste des habitudes du jour avec validation en un clic',
            'Compteur de séries (Streaks 🔥) et barre de complétion quotidienne',
            'Minuteur Focus / Pomodoro interactif (25min / 5min) avec Start/Pause',
            'Modale d\'ajout rapide d\'une nouvelle habitude avec icône personnalisée',
          ],
          implicitFeatures: [
            'Animation de célébration lors de la validation d\'une habitude',
            'Historique de productivité de la semaine',
            'Sélecteur de catégorie (Santé, Travail, Esprit, Sport)',
            'Feedback sonore et visuel à la fin du minuteur Pomodoro',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Focus',
              userGoal: 'Lancer une session de travail intense',
              screenTarget: 'Minuteur Pomodoro',
              keyInteractions: ['Démarrer le timer', 'Mettre en pause', 'Valider la session'],
            },
            {
              order: 2,
              stage: 'Routines',
              userGoal: 'Cocher ses habitudes et maintenir sa série',
              screenTarget: 'Habitudes du Jour',
              keyInteractions: ['Cocher une tâche', 'Voir la barre de progression se remplir'],
            },
          ],
          screens: ['Mes Habitudes', 'Minuteur Focus', 'Statistiques & Streaks', 'Nouvelle Habitude'],
          components: ['HabitCardItem', 'PomodoroTimer', 'StreakCounterBadge', 'NewHabitModal', 'ProgressBar'],
          interactions: ['Toggle habit complete', 'Start/Pause timer', 'Reset timer', 'Create habit', 'Switch category'],
          dataEntities: ['Habits', 'TimerSessions', 'Streaks', 'Categories'],
          uiStates: ['timer_running', 'timer_paused', 'habit_completed', 'modal_open'],
          responsiveStrategy: 'mobile_first',
          finishLevel: 'PREMIUM_CONSUMER',
        };

      case 'PREMIUM_LANDING':
        return {
          defaultTitle: 'Aether Cloud Platform',
          tagline: 'L\'infrastructure nouvelle génération pour accélérer vos déploiements mondiaux.',
          goal: 'Convertir les visiteurs en utilisateurs via un hero percutant, une démonstration interactive, des témoignages et un calculateur de tarification.',
          targetUsers: ['Développeurs', 'CTOs', 'Équipes d\'ingénierie moderne'],
          defaultExplicitFeatures: [
            'Section Hero avec proposition de valeur, badge d\'annonce et CTA percutants',
            'Aperçu interactif de l\'application au centre de l\'écran',
            'Grille de fonctionnalités avec onglets interactifs (Performance, Sécurité, Scalabilité)',
            'Calculateur de tarification avec toggle Mensuel / Annuel (-20%)',
            'Section FAQ accordéon et preuve sociale avec logos de clients',
          ],
          implicitFeatures: [
            'Bouton de démonstration vidéo ou essai gratuit sans carte bancaire',
            'Témoignages clients avec citation, photo et entreprise',
            'Micro-animations fluides au survol des cartes',
            'Formulaire de capture de lead dans le footer',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Découverte',
              userGoal: 'Comprendre la valeur ajoutée et tester la démo',
              screenTarget: 'Hero & Features',
              keyInteractions: ['Changer les onglets de fonctionnalités', 'Interagir avec l\'aperçu'],
            },
            {
              order: 2,
              stage: 'Conversion',
              userGoal: 'Choisir une offre tarifaire et s\'inscrire',
              screenTarget: 'Pricing & FAQ',
              keyInteractions: ['Basculer le toggle Annuel', 'Déplier les questions FAQ', 'Cliquer sur Commencer'],
            },
          ],
          screens: ['Accueil Hero', 'Fonctionnalités Clés', 'Tarification & Offres', 'FAQ & Contact'],
          components: ['HeroSection', 'InteractiveFeatureTabs', 'PricingTable', 'FaqAccordion', 'TestimonialCard'],
          interactions: ['Toggle billing period', 'Expand FAQ item', 'Switch feature tab', 'Click CTA button'],
          dataEntities: ['PricingPlans', 'Features', 'Testimonials', 'FaqItems'],
          uiStates: ['tab_active', 'faq_expanded', 'annual_billing_active', 'cta_modal_open'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'MINIMAL_STUDIO',
        };

      case 'PROJECT_MANAGEMENT':
        return {
          defaultTitle: 'Flow Kanban Pro',
          tagline: 'Orchestrez vos projets et suivez vos objectifs sans friction.',
          goal: 'Permettre le suivi visuel des tâches à travers des colonnes d\'avancement agiles, avec création instantanée et mise à jour de statut.',
          targetUsers: ['Gestionnaires de projets', 'Équipes agiles', 'Tech Leads'],
          defaultExplicitFeatures: [
            'Colonnes de statut Kanban (À faire, En cours, Revue, Terminé)',
            'Cartes de tâches interactives avec priorité et assigné',
            'Formulaire d\'ajout rapide de tâche avec priorité et tags',
            'Filtres par priorité (Critique, Haute, Moyenne, Basse) et recherche',
          ],
          implicitFeatures: [
            'Changement de colonne en un clic avec mise à jour immédiate',
            'Compteur de tâches par colonne et calcul d\'avancement de sprint',
            'Badges de priorité avec code couleur adapté',
            'Modale de détail complet de tâche',
          ],
          userJourney: [
            {
              order: 1,
              stage: 'Planification',
              userGoal: 'Créer et catégoriser une nouvelle tâche',
              screenTarget: 'Tableau Kanban',
              keyInteractions: ['Cliquer sur "+ Nouvelle Tâche"', 'Remplir le titre et la priorité', 'Valider'],
            },
            {
              order: 2,
              stage: 'Exécution',
              userGoal: 'Faire progresser les tâches vers l\'état Terminé',
              screenTarget: 'Colonnes Kanban',
              keyInteractions: ['Déplacer la carte', 'Marquer comme terminée'],
            },
          ],
          screens: ['Tableau Kanban', 'Vue Liste', 'Membres de l\'équipe', 'Statistiques de sprint'],
          components: ['KanbanColumn', 'TaskCard', 'NewTaskModal', 'PriorityBadge', 'MemberAvatar'],
          interactions: ['Move task stage', 'Create task', 'Filter priority', 'Search task title'],
          dataEntities: ['Tasks', 'Columns', 'TeamMembers', 'ActivityLog'],
          uiStates: ['board_ready', 'modal_open', 'task_selected', 'column_empty'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'ENTERPRISE_PRO',
        };

      default:
        return {
          defaultTitle: 'Vibe Application',
          tagline: 'Solution interactive sur-mesure conçue pour vos besoins spécifiques.',
          goal: prompt,
          targetUsers: ['Utilisateurs finaux', 'Professionnels'],
          defaultExplicitFeatures: ['Interface principale interactive', 'Contrôles de filtrage', 'Gestion des données dynamiques'],
          implicitFeatures: ['Navigation fluide', 'Feedback visuel sur les actions', 'États vides conviviaux'],
          userJourney: [
            {
              order: 1,
              stage: 'Accueil',
              userGoal: 'Découvrir et utiliser les outils principaux',
              screenTarget: 'Écran Principal',
              keyInteractions: ['Interagir avec les composants', 'Modifier les paramètres'],
            },
          ],
          screens: ['Accueil', 'Détails', 'Paramètres'],
          components: ['HeaderNav', 'MainInteractiveStage', 'DetailsPanel', 'ActionToolbar'],
          interactions: ['Click button', 'Search', 'Filter', 'Toggle'],
          dataEntities: ['Items', 'Settings'],
          uiStates: ['ready', 'filtered', 'detail_open'],
          responsiveStrategy: 'adaptive_container',
          finishLevel: 'PREMIUM_CONSUMER',
        };
    }
  }
}

export const productUnderstandingEngine = new ProductUnderstandingEngine();
