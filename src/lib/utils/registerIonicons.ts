/**
 * @module lib/utils/registerIonicons
 * @description Single registration point for the full Ionicons set.
 * @summary IconComponent, SearchbarComponent and ListItemComponent all need arbitrary
 * icon names to resolve at runtime (icon names can come from dynamic config/data, not
 * just template literals), so the whole Ionicons set must be registered rather than a
 * curated subset. ES modules are evaluated once and cached, so importing this file for
 * its side effect from multiple components is safe and only registers the icons once.
 */
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

addIcons(allIcons);
