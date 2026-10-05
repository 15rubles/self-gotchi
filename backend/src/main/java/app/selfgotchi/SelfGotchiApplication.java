package app.selfgotchi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SelfGotchiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SelfGotchiApplication.class, args);
    }
}
