# BPweb — Handoff Document

## Contexte

### Le Bol Processor (BP3)
Le **Bol Processor** est un système de composition algorithmique créé par Bernard Bel et Jim Kippen à partir de 1981. À l'origine conçu pour modéliser les improvisations de tabla (percussion indienne), il a évolué en un langage formel complet pour la musique : grammaires stochastiques pondérées, polymétrie native, flags (variables conditionnelles), patterns master/slave (copie synchronisée), 7 modes de dérivation, 68 fonctions de performance control.

C'est, à notre connaissance, le seul système musical qui opère au niveau **mildly context-sensitive** (même classe que les TAG et CCG en linguistique) — plus puissant qu'une grammaire context-free, mais encore tractable. Il est aussi le seul à être **bidirectionnel** : il peut générer de la musique (mode PROD) ET reconnaître si une séquence appartient à un langage musical (mode ANAL).

### Le problème
BP3 est un logiciel des années 90. Compilation C archaïque, interface Macintosh Classic portée tant bien que mal, documentation dispersée entre un site web, du code source et des communications personnelles. **Personne ne va l'installer pour essayer.** L'auteur de ce document y a passé 30 minutes avec assistance IA et n'a même pas pu vérifier si l'installation fonctionnait. C'est rédhibitoire pour l'adoption.

### Ce qui existe déjà
**BP2SC** est un transpileur Python (créé dans le cadre de cette thèse) qui convertit les grammaires BP3 en code SuperCollider. Il résout le problème de **sortie** — on peut entendre le résultat dans un environnement moderne. Mais il ne résout pas le problème d'**entrée** : il faut toujours écrire les grammaires à la main dans un format obscur, et BP3 doit tourner pour dériver.

En parallèle, un travail de formalisation doctoral a produit :
- L'**EBNF complète** du langage BP3 (~83 productions) — première spécification formelle de la syntaxe
- La **SOS** (sémantique opérationnelle structurelle) — spec exécutable du moteur de dérivation
- L'**AST** complet (29 nœuds) — structure de données intermédiaire
- La **classification de Chomsky** — positionnement théorique exact
- **36 articles de blog** publiés expliquant chaque aspect du formalisme
- **12 articles de recherche** en draft couvrant la théorie

Ce travail de formalisation est la base technique de BPweb : on a maintenant une spec complète pour réimplémenter BP3 from scratch, sans dépendre du code C.

### La démarche
L'idée est de transformer un formalisme puissant mais inaccessible en un **outil qui fait kiffer les utilisateurs**. Le modèle d'inspiration est **TidalCycles** : un langage de live coding musical (Haskell) qui a explosé grâce à une communauté active et une intégration fluide avec SuperCollider. TidalCycles cite d'ailleurs BP3 comme influence (McLean cite Bel2001 dans 8+ publications). La communauté SuperCollider est active et friande de ce type d'outils.

## Objectifs

### Objectif principal
Un utilisateur ouvre un navigateur, écrit une grammaire BP, appuie sur Play, et entend le résultat. **Zéro installation.**

### Objectifs produit
1. **Éditeur web** avec coloration syntaxique BP3 — écrire et modifier des grammaires visuellement
2. **Moteur de dérivation** JS/TS (parser + dériveur) — remplace le binaire C de BP3, tourne dans le navigateur
3. **Intégration SuperCollider** via OSC/WebSocket ou Quark SC — pour les utilisateurs SC existants
4. **Bibliothèque de patterns** prêts à l'emploi (tabla, raga, Bach, minimalisme...) — on démarre pas de zéro
5. **Traducteur MusicXML → BP** pour alimenter la bibliothèque automatiquement à partir de corpus existants (MuseScore, IMSLP)

### Objectifs communauté
- Profiter de la **communauté SuperCollider** existante (~10k utilisateurs actifs)
- Proposer BPweb comme **Quark SC** installable en une commande
- Fournir des exemples musicaux convaincants dès le lancement (pas des "do ré mi" académiques)
- Permettre le **partage de grammaires** entre utilisateurs

---

## Ressources existantes — Où trouver quoi

### 1. BP2SC — Le transpileur existant
**Chemin** : `/mnt/d/Claude/BP2SC/`

```
BP2SC/
├── src/bp2sc/
│   ├── grammar/
│   │   ├── parser.py          ← Parser BP3 (Lark-based)
│   │   └── transformer.py     ← Lark → AST
│   ├── ast_nodes.py           ← 25+ nœuds AST Python (dataclasses)
│   ├── alphabet_parser.py     ← Parse les fichiers -al.*
│   ├── settings_parser.py     ← Parse les fichiers -se.*
│   ├── note_converter.py      ← 4 systèmes de notation → MIDI
│   ├── sc_emitter.py          ← AST → code SuperCollider
│   ├── sc_templates.py        ← Templates SC (Pbind, etc.)
│   ├── scale_map.py           ← Gammes et accords
│   └── structure_inference/   ← Inférence structurelle (GTTM)
├── bp3-ctests/                ← 52 grammaires de test (originales BP3)
├── tests/                     ← Tests Python
├── examples/                  ← Exemples de sortie
└── pyproject.toml             ← Config projet Python
```

**Ce que BP2SC fait déjà** :
- Parse les fichiers grammaire (`-gr.*`), alphabet (`-al.*`), settings (`-se.*`)
- Construit un AST complet (25 types de nœuds)
- Émet du code SuperCollider (Pbind, Ppar pour polymétrie)
- Gère les 4 systèmes de notation (français, anglo-saxon, indien, keys)

**Ce que BP2SC ne fait PAS** :
- Dériver (il prend le résultat déjà dérivé par BP3)
- Mode ANAL (reconnaissance / parsing)
- Patterns master/slave (runtime)
- Flags (runtime)

### 2. Spécification formelle complète
**Chemin** : `/mnt/d/Romain/Articles/Projets/Ontologie musicale/`

#### EBNF — La grammaire de BP3
- **Référence technique** : `scratch/EBNF_Reference_BP3.md` (~83 productions)
- **Article vulgarisé** : `40_OUTPUT/Blog/B10_EBNF_BP3.md` (chaque production expliquée avec exemples et source C)
- **Audit** : `scratch/EBNF_Audit_Matrix.md` (couverture des productions vs code C)

L'EBNF couvre : structure de fichier, 7 modes, 3 flèches, 23 types rhs_element, 68 performance controls, templates, patterns master/slave.

#### AST — Les nœuds de l'arbre
- **Spécification R2** : `40_OUTPUT/Blog/R2_Specification_BP3.md`
  - 29 nœuds en 11 catégories
  - Chaque nœud : description, classe Python, champs, exemples, contraintes de validation
  - Table de mapping BP3 → AST → SuperCollider

Nœuds clés pour BPweb :
| #   | Nœud            | Rôle                                      |
| --- | --------------- | ----------------------------------------- |
| 1   | `Note`          | note + octave                             |
| 5   | `Polymetric`    | `{ratio, voix1, voix2}`                   |
| 6   | `SpecialFn`     | `_tempo()`, `_vel()`, etc. (68 fonctions) |
| 8   | `FlagCondition` | `/flag>5/`                                |
| 18  | `PatternExpr`   | `(= ...)` master, `(: ...)` slave         |
| 19  | `PatternKind`   | MASTER / SLAVE / REF                      |

#### SOS — Sémantique opérationnelle (comment dériver)
- **Paper 1** : `40_OUTPUT/Papers/P1_Formalisation_BP3.md` §3
  - §3.1 : Configuration = (chaîne, flags, temps)
  - §3.2 : Règles de dérivation pour ORD, RND, SUB, SUB1 + patterns master/slave
  - §3.3 : Sémantique des flags (conditions + mises à jour)
  - §3.4 : Sémantique de la polymétrie

C'est la **spec pour implémenter le moteur de dérivation**.

### 3. Code source C de BP3 (référence)
**Chemin** : `/mnt/d/Claude/musicology-phd/scratch/bp3-source/`

```
bp3-source/
├── source/BP3/           ← 43 fichiers .c, 5 fichiers .h
│   ├── Encode.c          ← Tokenisation (T0-T45)
│   ├── CompileGrammar.c  ← Compilation des grammaires
│   ├── Compute.c         ← Moteur de dérivation (les 7 modes)
│   ├── CompileProcs.c    ← Performance controls
│   ├── Polymetric.c      ← Algorithme PolyMake
│   ├── -BP3.h            ← Constantes principales
│   ├── -BP3main.h        ← Tokens, modes, flags
│   └── ...
├── source/not_used/
│   └── StringLists.h     ← Table des 68 performance controls
└── docs-developer/
    └── BP2-info.txt      ← Spécification des tokens T0-T45
```

**Usage** : référence pour vérifier le comportement exact quand la spec est ambiguë. Ne pas tenter de compiler — utiliser la SOS de Paper 1 comme spec d'implémentation.

### 4. Fichiers de test
**Chemin** : `/mnt/d/Claude/BP2SC/bp3-ctests/` (= `/mnt/d/Claude/musicology-phd/scratch/bp3-ctests/`)

52 grammaires de test couvrant tous les features :
- `-gr.12345678` — test basique multi-modes
- `-gr.dhati` — tabla indien (modes SUB, flags, polymétrie)
- `-gr.Mozart` — poids K interactifs
- `-gr.checktemplates` — mode TEM et templates
- `-gr.koto3` — instrument japonais
- `-gr.tryFlags` — flags complexes
- `-da.tryCapture`, `-da.tryPart` — data files

Chaque `-gr.*` a souvent un `-al.*` (alphabet) et `-se.*` (settings) associé.

### 5. Articles de blog (documentation vulgarisée)
**Chemin publiés** : `/mnt/d/Romain/Articles/Publications/roomi-fields.com/Articles/`
**Chemin drafts** : `/mnt/d/Romain/Articles/Projets/Ontologie musicale/40_OUTPUT/Blog/`

| Article | Sujet                           | Pertinence BPweb                 |
| ------- | ------------------------------- | -------------------------------- |
| B1      | PCFG — grammaires stochastiques | Comprendre les poids             |
| B2      | Alphabets et terminaux          | Parser les fichiers `-al.*`      |
| B3      | Règles de dérivation et 7 modes | **Implémenter le dériveur**      |
| B4      | Flags et poids                  | **Implémenter les flags**        |
| B5      | Polymétrie                      | **Implémenter `{ratio, voix}` ** |
| B6      | Homomorphismes (→ PatternExpr)  | **Implémenter master/slave**     |
| B7      | Transpileur BP2SC               | Architecture existante           |
| B8      | 3 directions (PROD/ANAL/TEMP)   | Modes de fonctionnement          |
| B10     | EBNF de BP3                     | **Spec du parser**               |
| B12     | Smooth time et `_tempo()`       | Gestion du temps                 |
| B13     | PolyMake (algorithme)           | **Algorithme polymétrie**        |
| R2      | Spécification AST complète      | **Nœuds AST**                    |

### 6. Papers de recherche
**Chemin** : `/mnt/d/Romain/Articles/Projets/Ontologie musicale/40_OUTPUT/Papers/`

| Paper | Sujet                                    | Utilité            |
| ----- | ---------------------------------------- | ------------------ |
| P1    | Formalisation BP3 (EBNF + SOS + Chomsky) | **Spec du moteur** |
| P9α   | Asymétrie génératif/analytique (soumis)  | Contexte théorique |
| P10   | Réversibilité des grammaires musicales   | Justification ANAL |

---

## Architecture proposée pour BPweb

```
BPweb/
├── packages/
│   ├── bp-parser/         ← Parser BP3 en TS (depuis l'EBNF B10)
│   ├── bp-engine/         ← Moteur de dérivation (depuis SOS Paper 1)
│   ├── bp-sc-bridge/      ← OSC/WebSocket → SuperCollider
│   ├── bp-web-audio/      ← Fallback WebAudio (sans SC)
│   └── bp-musicxml/       ← Traducteur MusicXML → BP
├── apps/
│   └── editor/            ← Éditeur web (Monaco/CodeMirror + UI)
├── library/               ← Bibliothèque de patterns BP
│   ├── tabla/
│   ├── raga/
│   ├── western/
│   └── imported/          ← Conversions MusicXML automatiques
└── docs/
```

### Séquence d'implémentation suggérée

1. **bp-parser** — Traduire l'EBNF en parser TS. L'EBNF est complète (83 productions), les tests existent (52 fichiers). BP2SC utilise Lark (Python) — repartir de la même grammaire ou de l'EBNF formelle.

2. **bp-engine** — Implémenter les modes de dérivation un par un :
   - ORD (le plus simple, séquentiel)
   - RND (aléatoire pondéré — ajouter les poids)
   - SUB / SUB1 (substitution)
   - Flags (conditions + mises à jour)
   - Polymétrie (algorithme PolyMake — voir B13)
   - Patterns master/slave (copie synchronisée)
   - TEM (exhaustif — dernier, le plus complexe)

3. **Éditeur** — CodeMirror + coloration syntaxique BP3 + preview temps réel

4. **bp-sc-bridge** — Connexion SuperCollider via OSC

5. **bp-musicxml** — Parser MusicXML → générer des grammaires BP (le mode ANAL en reverse)

6. **library** — Convertir les 52 tests existants + importer des corpus MusicXML

---

## Points d'attention

### Nommage AST
Le nœud `HomoApply` a été renommé `PatternExpr` dans toute la documentation (B10, R2, EBNF Reference, Paper 1) pour refléter la double fonction : copie synchronisée + homomorphisme optionnel. **BP2SC utilise encore l'ancien nom `HomoApply`** dans `ast_nodes.py` — à aligner.

### Ce que BP2SC a déjà résolu
- Les 4 systèmes de notation (français `do ré mi`, anglo-saxon `C D E`, indien `sa re ga`, keys `1 2 3`)
- Le parsing des fichiers `-al.*`, `-se.*`, `-gr.*`
- La conversion vers SuperCollider (Pbind, Ppar)
- La gestion des gammes et accords

### Ce qui reste le plus dur
- **L'algorithme PolyMake** (B13) — expansion polymétrique avec quantization, non trivial
- **Les flags au runtime** — conditions + mises à jour pendant la dérivation
- **Les patterns master/slave** — liaison à la compilation, copie à la dérivation
- **Le temps continu** — `_tempo()` et smooth time (B12)

### Questions ouvertes pour Bernard Bel
Un mail de questions est préparé : `/mnt/d/Romain/Articles/Projets/Ontologie musicale/scratch/mail_Bernard_EBNF_questions.md` (7 questions sur `<<...>>`, templates, POSLONG, `<--`, `_scale`, `_part`, `_goto`).

---

## Liens utiles

- **Site BP3** : https://bolprocessor.org
- **Code source BP3** : https://github.com/bolprocessor/bolern (si public)
- **SuperCollider** : https://supercollider.github.io
- **TidalCycles** (modèle d'adoption réussie) : https://tidalcycles.org
- **MuseScore** (corpus MusicXML) : https://musescore.com
- **Blog de recherche** : https://roomi-fields.com (36 articles publiés)
