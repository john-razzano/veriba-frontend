import { Dimensions, StyleSheet, View } from 'react-native';

import { AutoRevealTile } from '@/src/components/auto-reveal-tile';
import { CaseTile } from '@/src/components/case-tile';
import type { FeedCase } from '@/src/data/mock-feed';

interface MosaicFeedProps {
  cases: FeedCase[];
  onPressCase?: (c: FeedCase) => void;
}

const GAP = 2;
// Instagram-Explore geometry: 3-column grid of square unit cells; the hero
// spans 2×2. Unit = (screen − outer padding − two column gaps) / 3.
const SCREEN_W = Dimensions.get('window').width;
const UNIT = Math.floor((SCREEN_W - GAP * 4) / 3);
const HERO = UNIT * 2 + GAP;

/**
 * Edge-to-edge 3-column mosaic. Each block of 6 cases renders as an animated
 * 2×2 hero with a stacked pair beside it, then a row of three. Only the hero
 * carries labels — small tiles are bare images; tap for detail.
 */
export function MosaicFeed({ cases, onPressCase }: MosaicFeedProps) {
  const rows: React.ReactNode[] = [];

  for (let i = 0; i < cases.length; i += 6) {
    const group = cases.slice(i, i + 6);
    if (group.length === 0) break;
    const blockIndex = i / 6;
    const heroLeft = blockIndex % 2 === 0;
    const [hero, a, b, c, d, e] = group;

    const heroTile = hero ? (
      <AutoRevealTile
        key={`${hero.id}-hero`}
        style={styles.hero}
        beforeUri={hero.beforeUri}
        afterUri={hero.afterUri}
        beforeBlurhash={hero.beforeBlurhash}
        afterBlurhash={hero.afterBlurhash}
        treatment={hero.treatment}
        clinic={hero.clinic}
        delay={heroLeft ? 0 : 1300}
        onPress={() => onPressCase?.(hero)}
      />
    ) : null;

    const column = (
      <View key={`${hero?.id}-col`} style={styles.col}>
        {[a, b].map((item) =>
          item ? (
            <CaseTile
              key={item.id}
              afterUri={item.afterUri}
              blurhash={item.afterBlurhash}
              treatment={item.treatment}
              clinic={item.clinic}
              labelVariant="none"
              onPress={() => onPressCase?.(item)}
            />
          ) : null
        )}
      </View>
    );

    rows.push(
      <View key={`row-${i}-top`} style={[styles.row, { height: HERO }]}>
        {heroLeft ? [heroTile, column] : [column, heroTile]}
      </View>
    );

    const bottom = [c, d, e].filter(Boolean) as FeedCase[];
    if (bottom.length > 0) {
      rows.push(
        <View key={`row-${i}-bot`} style={[styles.row, { height: UNIT }]}>
          {bottom.map((item) => (
            <CaseTile
              key={item.id}
              afterUri={item.afterUri}
              blurhash={item.afterBlurhash}
              treatment={item.treatment}
              clinic={item.clinic}
              labelVariant="none"
              onPress={() => onPressCase?.(item)}
            />
          ))}
        </View>
      );
    }
  }

  return <View style={styles.feed}>{rows}</View>;
}

const styles = StyleSheet.create({
  feed: { paddingHorizontal: GAP },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  // flex: 0 so the tile's own flex: 1 doesn't override the fixed 2-unit width
  hero: { flex: 0, width: HERO },
  col: { flex: 1, gap: GAP },
});
