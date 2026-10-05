package app.selfgotchi.state;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/** The State Engine must stay plain Java: no framework, persistence or serialization imports. */
@AnalyzeClasses(packages = "app.selfgotchi.state", importOptions = ImportOption.DoNotIncludeTests.class)
class StatePurityArchTest {

    @ArchTest
    static final ArchRule noFrameworkDependencies = noClasses()
        .that().resideInAPackage("app.selfgotchi.state..")
        .should().dependOnClassesThat().resideInAnyPackage(
            "org.springframework..",
            "jakarta.persistence..",
            "org.hibernate..",
            "com.fasterxml..")
        .because("the State Engine is a pure function (see CLAUDE.md)");

    @ArchTest
    static final ArchRule noOtherAppModules = noClasses()
        .that().resideInAPackage("app.selfgotchi.state..")
        .should().dependOnClassesThat().resideInAnyPackage(
            "app.selfgotchi.task..", "app.selfgotchi.user..", "app.selfgotchi.stateapi..",
            "app.selfgotchi.avatar..", "app.selfgotchi.notify..", "app.selfgotchi.config..")
        .because("other modules depend on the engine, not the other way round");

    @ArchTest
    static final ArchRule noWallClock = noClasses()
        .that().resideInAPackage("app.selfgotchi.state..")
        .should().callMethod(java.time.Instant.class, "now")
        .orShould().callMethod(java.time.LocalDate.class, "now")
        .orShould().callMethod(java.time.LocalDateTime.class, "now")
        .orShould().callMethod(java.time.ZonedDateTime.class, "now")
        .orShould().callMethod(System.class, "currentTimeMillis")
        .because("the engine receives `now` as an argument");
}
