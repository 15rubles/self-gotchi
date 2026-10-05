package app.selfgotchi.user;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings for the single personal-phase user (there is no settings screen yet).
 *
 * @param timezone      IANA zone id; blank means the JVM default at first start
 * @param dayResetHour  local hour a new day starts; null keeps the stored value (default 4)
 */
@ConfigurationProperties("app.user")
public record UserProperties(String displayName, String timezone, Integer dayResetHour) {
}
