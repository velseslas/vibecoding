import crypto from 'crypto';
import { ProductUnderstanding, ProductArchetype } from './productUnderstandingEngine';
import { logger } from '../logger';

export interface ProductScreenSpec {
  id: string;
  name: string;
  title: string;
  layoutType: 'deck' | 'grid' | 'kanban' | 'list' | 'split' | 'modal' | 'feed';
  components: string[];
  isDefaultActive: boolean;
  navLabel: string;
  navIcon: string;
}

export interface ProductFeatureSpec {
  id: string;
  name: string;
  description: string;
  isImplicit: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface ProductDataEntitySpec {
  name: string;
  fields: Array<{ name: string; type: string; example: any }>;
  seedCount: number;
}

export interface InteractionSpec {
  id: string;
  trigger: string;
  sourceElement: string;
  targetAction: string;
  stateChange: string;
  visualFeedback: string;
}

export interface NavigationSpec {
  type: 'bottom_bar' | 'header_pills' | 'sidebar' | 'tab_menu';
  items: Array<{
    id: string;
    label: string;
    icon: string;
    badgeCount?: number;
    targetScreenId: string;
  }>;
}

export interface ProductBlueprint {
  id: string;
  archetype: ProductArchetype;
  title: string;
  tagline: string;
  goal: string;
  targetAudience: string[];
  screens: ProductScreenSpec[];
  features: ProductFeatureSpec[];
  dataModel: ProductDataEntitySpec[];
  interactions: InteractionSpec[];
  navigation: NavigationSpec;
  uiStates: string[];
  responsiveStrategy: 'mobile_first' | 'desktop_first' | 'adaptive_container';
  containerMaxWidth: string;
  finishLevel: 'PREMIUM_CONSUMER' | 'ENTERPRISE_PRO' | 'MINIMAL_STUDIO';
  completenessScore: number;
  createdAt: number;
}

export class ProductBlueprintService {
  /**
   * Generates a complete, structured Product Blueprint from a Product Understanding
   */
  public generateBlueprint(understanding: ProductUnderstanding, prompt: string): ProductBlueprint {
    const blueprintId = 'bp_' + crypto.randomBytes(6).toString('hex');

    const screens: ProductScreenSpec[] = this.buildScreens(understanding);
    const features: ProductFeatureSpec[] = this.buildFeatures(understanding);
    const dataModel: ProductDataEntitySpec[] = this.buildDataModel(understanding);
    const interactions: InteractionSpec[] = this.buildInteractions(understanding);
    const navigation: NavigationSpec = this.buildNavigation(understanding, screens);

    const maxWidth = understanding.responsiveStrategy === 'mobile_first' ? 'max-w-md' : 'max-w-7xl';

    const blueprint: ProductBlueprint = {
      id: blueprintId,
      archetype: understanding.archetype,
      title: understanding.productTitle,
      tagline: understanding.tagline,
      goal: understanding.productGoal,
      targetAudience: understanding.targetUsers,
      screens,
      features,
      dataModel,
      interactions,
      navigation,
      uiStates: understanding.requiredUIStates,
      responsiveStrategy: understanding.responsiveStrategy,
      containerMaxWidth: maxWidth,
      finishLevel: understanding.finishLevel,
      completenessScore: 98,
      createdAt: Date.now(),
    };

    logger.info('ProductBlueprint', `Generated blueprint [${blueprint.id}] for archetype [${blueprint.archetype}] - ${screens.length} screens, ${interactions.length} interactions`);
    return blueprint;
  }

  private buildScreens(u: ProductUnderstanding): ProductScreenSpec[] {
    switch (u.archetype) {
      case 'DATING_APP':
        return [
          {
            id: 'screen-discover',
            name: 'Découverte',
            title: 'Découvrir des Profils',
            layoutType: 'deck',
            components: ['SwipeCardDeck', 'ActionButtonsBar', 'HeaderBrandBar'],
            isDefaultActive: true,
            navLabel: 'Découvrir',
            navIcon: 'flame',
          },
          {
            id: 'screen-matches',
            name: 'Matchs & Messages',
            title: 'Vos Matchs & Discussions',
            layoutType: 'list',
            components: ['StoriesRow', 'ConversationsList', 'ChatWindow'],
            isDefaultActive: false,
            navLabel: 'Matchs',
            navIcon: 'message-circle',
          },
          {
            id: 'screen-chat',
            name: 'Chat & Messagerie',
            title: 'Discussion Active',
            layoutType: 'list',
            components: ['ChatWindow', 'MessageInput'],
            isDefaultActive: false,
            navLabel: 'Messages',
            navIcon: 'message-square',
          },
          {
            id: 'screen-profile',
            name: 'Mon Profil',
            title: 'Profil & Préférences',
            layoutType: 'split',
            components: ['ProfileHeader', 'PhotosGrid', 'BioSection', 'InterestsList', 'SettingsButton'],
            isDefaultActive: false,
            navLabel: 'Profil',
            navIcon: 'user',
          },
        ];

      case 'SAAS_DASHBOARD':
        return [
          {
            id: 'screen_overview',
            name: 'Vue d\'ensemble',
            title: 'Tableau de Bord & KPIs',
            layoutType: 'grid',
            components: ['KpiSummaryCards', 'TrendChart', 'TransactionTable', 'TimeFilter'],
            isDefaultActive: true,
            navLabel: 'Analytics',
            navIcon: 'layout-dashboard',
          },
          {
            id: 'screen_transactions',
            name: 'Transactions',
            title: 'Historique des Paiements',
            layoutType: 'list',
            components: ['TransactionSearch', 'StatusFilter', 'DetailedTable', 'ExportBtn'],
            isDefaultActive: false,
            navLabel: 'Revenus',
            navIcon: 'credit-card',
          },
        ];

      case 'PROJECT_MANAGEMENT':
      case 'CRM':
        return [
          {
            id: 'screen_kanban',
            name: 'Tableau Kanban',
            title: 'Pipeline des Tâches',
            layoutType: 'kanban',
            components: ['KanbanBoard', 'TaskFilterBar', 'NewTaskBtn', 'TaskDetailsDrawer'],
            isDefaultActive: true,
            navLabel: 'Tableau',
            navIcon: 'trello',
          },
          {
            id: 'screen_activity',
            name: 'Activité',
            title: 'Journal d\'Activité & Métriques',
            layoutType: 'feed',
            components: ['ActivityFeed', 'TeamStats'],
            isDefaultActive: false,
            navLabel: 'Activité',
            navIcon: 'activity',
          },
        ];

      default:
        return [
          {
            id: 'screen_home',
            name: 'Accueil',
            title: u.productTitle,
            layoutType: 'grid',
            components: ['HeroStage', 'InteractiveWorkspace', 'ActionBar'],
            isDefaultActive: true,
            navLabel: 'Accueil',
            navIcon: 'home',
          },
        ];
    }
  }

  private buildFeatures(u: ProductUnderstanding): ProductFeatureSpec[] {
    const specs: ProductFeatureSpec[] = [];

    u.explicitFeatures.forEach((f, idx) => {
      specs.push({
        id: `feat_exp_${idx + 1}`,
        name: f,
        description: `Fonctionnalité explicite demandée par l'utilisateur : ${f}`,
        isImplicit: false,
        priority: 'CRITICAL',
      });
    });

    u.implicitFeatures.forEach((f, idx) => {
      specs.push({
        id: `feat_imp_${idx + 1}`,
        name: f,
        description: `Exigence implicite du pattern produit : ${f}`,
        isImplicit: true,
        priority: idx === 0 ? 'HIGH' : 'MEDIUM',
      });
    });

    return specs;
  }

  private buildDataModel(u: ProductUnderstanding): ProductDataEntitySpec[] {
    switch (u.archetype) {
      case 'SOCIAL_NETWORK':
        return [
          {
            name: 'Story',
            fields: [
              { name: 'id', type: 'string', example: 'story_1' },
              { name: 'authorName', type: 'string', example: 'Léa Bernard' },
              { name: 'avatarUrl', type: 'string', example: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
              { name: 'hasUnseenStory', type: 'boolean', example: true },
            ],
            seedCount: 5,
          },
          {
            name: 'Post',
            fields: [
              { name: 'id', type: 'string', example: 'post_1' },
              { name: 'authorName', type: 'string', example: 'Camille Laurent' },
              { name: 'authorRole', type: 'string', example: 'Designer UI/UX' },
              { name: 'authorAvatar', type: 'string', example: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80' },
              { name: 'timestamp', type: 'string', example: 'Il y a 2h' },
              { name: 'content', type: 'string', example: 'Nouveau projet finalisé avec un design système moderne et fluide. Qu\'en pensez-vous ? ✨🚀' },
              { name: 'mediaUrl', type: 'string', example: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80' },
              { name: 'likesCount', type: 'number', example: 142 },
              { name: 'commentsCount', type: 'number', example: 28 },
              { name: 'isLiked', type: 'boolean', example: false },
            ],
            seedCount: 3,
          },
          {
            name: 'Contact',
            fields: [
              { name: 'id', type: 'string', example: 'contact_1' },
              { name: 'name', type: 'string', example: 'Thomas Dubois' },
              { name: 'avatarUrl', type: 'string', example: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' },
              { name: 'isOnline', type: 'boolean', example: true },
            ],
            seedCount: 8,
          },
        ];

      case 'PROJECT_MANAGEMENT':
        return [
          {
            name: 'ProjectTask',
            fields: [
              { name: 'id', type: 'string', example: 'task_101' },
              { name: 'title', type: 'string', example: 'Fondations et Gros Œuvre Chantier Nord' },
              { name: 'status', type: 'string', example: 'EN_COURS' },
              { name: 'assignee', type: 'string', example: 'Marc Antoine' },
              { name: 'priority', type: 'string', example: 'HAUTE' },
              { name: 'dueDate', type: 'string', example: '15 Sept.' },
            ],
            seedCount: 6,
          },
        ];

      case 'DATING_APP':
        return [
          {
            name: 'Profile',
            fields: [
              { name: 'id', type: 'string', example: 'prof_1' },
              { name: 'name', type: 'string', example: 'Camille' },
              { name: 'age', type: 'number', example: 25 },
              { name: 'distanceKm', type: 'number', example: 4 },
              { name: 'job', type: 'string', example: 'Directrice Artistique' },
              { name: 'bio', type: 'string', example: 'Passionnée de photographie argentique, architecture et café de spécialité ☕✨' },
              { name: 'photos', type: 'string[]', example: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'] },
              { name: 'interests', type: 'string[]', example: ['Design', 'Photo', 'Rando', 'Voyages', 'Yoga'] },
              { name: 'isVerified', type: 'boolean', example: true },
              { name: 'matchPercentage', type: 'number', example: 94 },
            ],
            seedCount: 6,
          },
          {
            name: 'Match',
            fields: [
              { name: 'id', type: 'string', example: 'match_1' },
              { name: 'profileId', type: 'string', example: 'prof_1' },
              { name: 'matchedAt', type: 'number', example: Date.now() - 3600000 },
              { name: 'lastMessage', type: 'string', example: 'Salut ! J\'adore ta photo au musée d\'Orsay :)' },
              { name: 'unread', type: 'boolean', example: true },
            ],
            seedCount: 4,
          },
        ];

      case 'SAAS_DASHBOARD':
        return [
          {
            name: 'Metric',
            fields: [
              { name: 'label', type: 'string', example: 'Revenu Mensuel Récurrent (MRR)' },
              { name: 'value', type: 'string', example: '48 250 €' },
              { name: 'trend', type: 'string', example: '+14.2%' },
              { name: 'isPositive', type: 'boolean', example: true },
            ],
            seedCount: 4,
          },
          {
            name: 'Transaction',
            fields: [
              { name: 'id', type: 'string', example: 'tx_982' },
              { name: 'clientName', type: 'string', example: 'Acme Studio' },
              { name: 'amount', type: 'string', example: '1 200 €' },
              { name: 'status', type: 'string', example: 'Payé' },
              { name: 'date', type: 'string', example: 'Il y a 2h' },
            ],
            seedCount: 5,
          },
        ];

      default:
        return [
          {
            name: 'Item',
            fields: [
              { name: 'id', type: 'string', example: 'item_1' },
              { name: 'title', type: 'string', example: 'Élément principal' },
              { name: 'status', type: 'string', example: 'Actif' },
            ],
            seedCount: 4,
          },
        ];
    }
  }

  private buildInteractions(u: ProductUnderstanding): InteractionSpec[] {
    switch (u.archetype) {
      case 'DATING_APP':
        return [
          {
            id: 'int_swipe_drag',
            trigger: 'Mouse/Touch drag on card',
            sourceElement: '#active-card',
            targetAction: 'Follow pointer with rotation transform',
            stateChange: 'Update drag coordinates & show LIKE / NOPE stamp opacity',
            visualFeedback: 'Card moves smoothly with angle rotation (-15deg to +15deg)',
          },
          {
            id: 'int_like_click',
            trigger: 'Click #btn-like or swipe right threshold',
            sourceElement: '#btn-like',
            targetAction: 'Animate card out to right + trigger Match evaluation',
            stateChange: 'Remove top card, add to liked list, show match popup if profile matches',
            visualFeedback: 'Card flies right with green glow, triggers match celebration modal',
          },
          {
            id: 'int_pass_click',
            trigger: 'Click #btn-pass or swipe left threshold',
            sourceElement: '#btn-pass',
            targetAction: 'Animate card out to left',
            stateChange: 'Remove top card, advance to next profile in deck',
            visualFeedback: 'Card flies left with red flash',
          },
          {
            id: 'int_superlike_click',
            trigger: 'Click #btn-superlike',
            sourceElement: '#btn-superlike',
            targetAction: 'Animate card upwards with golden star particles',
            stateChange: 'Instantly trigger match overlay with superlike badge',
            visualFeedback: 'Golden particle explosion and instant match celebration',
          },
          {
            id: 'int_tab_nav',
            trigger: 'Click navigation items (Découvrir, Matchs, Profil)',
            sourceElement: '.nav-tab-btn',
            targetAction: 'Switch visible view container',
            stateChange: 'Set active screen ID and update bottom nav active indicator',
            visualFeedback: 'Smooth view transition and badge highlight',
          },
        ];

      default:
        return [
          {
            id: 'int_default_action',
            trigger: 'Click primary action button',
            sourceElement: '#btn-primary-action',
            targetAction: 'Execute workflow',
            stateChange: 'Update items state',
            visualFeedback: 'Toast confirmation & state update',
          },
        ];
    }
  }

  private buildNavigation(u: ProductUnderstanding, screens: ProductScreenSpec[]): NavigationSpec {
    return {
      type: u.responsiveStrategy === 'mobile_first' ? 'bottom_bar' : 'header_pills',
      items: screens.map((s) => ({
        id: `nav_${s.id}`,
        label: s.navLabel,
        icon: s.navIcon,
        badgeCount: s.id === 'screen_matches' ? 3 : undefined,
        targetScreenId: s.id,
      })),
    };
  }
}

export const productBlueprintService = new ProductBlueprintService();
