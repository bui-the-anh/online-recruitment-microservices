import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Injectable()
export class KafkaEventsService {
  constructor(@Inject("KAFKA_EVENTS") private readonly kafka: ClientProxy) {}

  async publish(topic: string, payload: object): Promise<void> {
    await firstValueFrom(this.kafka.emit(topic, payload));
  }
}
