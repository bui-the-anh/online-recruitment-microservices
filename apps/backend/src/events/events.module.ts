import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { KafkaEventsService } from "./kafka-events.service";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "KAFKA_EVENTS",
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: "careerlink-domain-events",
            brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
    ]),
  ],
  providers: [KafkaEventsService],
  exports: [KafkaEventsService],
})
export class EventsModule {}
