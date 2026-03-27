# Tritri-Lab

**Tritri-Lab** est une application interactive permettant de visualiser du texte phonétique sous forme de glyphes géométriques ("tritri-binaire"). Ce projet explore la relation entre la phonétique, le binaire et la géométrie générative.
Elle s'inscrit dans une volonté d'étendre les travaux de Boby Lapointer sur son système [bibi-binaire](https://fr.wikipedia.org/wiki/Syst%C3%A8me_bibi-binaire) à un syllabaire français.

## Logique Tri Tri

Chaque syllabe est représentée par une chaîne binaire de 9 bits (ex: `100101111`) mappée sur une grille 3x3 suivant un chemin en serpentin (Bas-Haut-Bas).

- **Points d'Ancre** : Les bits sont rendus sous forme de caractères '0' ou '1' à 40% d'opacité, centrés sur les coordonnées de la grille.
- **Stabilité des Arcs** : En mode Script, la sélection de l'arc favorise systématiquement la trajectoire qui s'éloigne du centre du glyphe, garantissant un rendu visuel cohérent.

## Utilisation

Aucune installation complexe n'est requise. Clonez le dépôt et ouvrez `index.html` dans votre navigateur.

```bash
git clone https://github.com/whayn/tritri-lab.git
cd tritri-lab
# Ouvrez index.html dans un navigateur moderne
```

## Fonctionnalités

- **Traduction Phonétique Automatique** : Saisissez du texte en français et laissez l'algorithme "greedy matching" le convertir en syllabes phonétiques compatibles.
- **Rendu Multi-lignes** : Supporte l'édition de texte complexe avec gestion des espaces et des retours à la ligne (Mode Éditeur).
- **Modes de Tracé** :
  - **Script** : Arcs de cercles fluides avec une esthétique calligraphique stable.
  - **Spline & B-Spline** : Courbes mathématiques (Catmull-Rom et B-Splines) pour des formes plus organiques.
- **Contrôles Paramétriques** : Ajustez en temps réel le rayon (tension), l'épaisseur, la taille, l'espacement et la hauteur de ligne.


## Crédits

Ce projet est réalisé dans le cadre de l'atelier **Maths en Jeans** 2025-2026.
Logiciel développé pour la visualisation et l'expérimentation du système Tri Tri.
