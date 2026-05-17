package messaging

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQConsumer subscribes to a topic exchange and exposes a delivery
// channel. Mirrors the consumer pattern in notification-service.
type RabbitMQConsumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   string
}

func NewRabbitMQConsumer(
	rabbitURL string,
	exchange string,
	queue string,
	bindingKeys []string,
	consumerTag string,
) (*RabbitMQConsumer, <-chan amqp.Delivery, error) {
	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		return nil, nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, nil, err
	}

	err = ch.ExchangeDeclare(exchange, "topic", true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	_, err = ch.QueueDeclare(queue, true, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	for _, bindingKey := range bindingKeys {
		if err := ch.QueueBind(queue, bindingKey, exchange, false, nil); err != nil {
			_ = ch.Close()
			_ = conn.Close()
			return nil, nil, err
		}
	}

	deliveries, err := ch.Consume(queue, consumerTag, false, false, false, false, nil)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, err
	}

	return &RabbitMQConsumer{conn: conn, channel: ch, queue: queue}, deliveries, nil
}

func (c *RabbitMQConsumer) Close() {
	if c.channel != nil {
		_ = c.channel.Close()
	}
	if c.conn != nil {
		_ = c.conn.Close()
	}
}
