package messaging

import (
	"context"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQPublisher struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
}

func NewRabbitMQPublisher(rabbitURL string, exchange string) (*RabbitMQPublisher, error) {
	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, err
	}

	err = ch.ExchangeDeclare(
		exchange,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, err
	}

	return &RabbitMQPublisher{
		conn:     conn,
		channel:  ch,
		exchange: exchange,
	}, nil
}

func (p *RabbitMQPublisher) Publish(
	ctx context.Context,
	routingKey string,
	eventID string,
	payload []byte,
) error {
	return p.channel.PublishWithContext(
		ctx,
		p.exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    eventID,
			Type:         routingKey,
			Timestamp:    time.Now(),
			Body:         payload,
		},
	)
}

func (p *RabbitMQPublisher) Close() {
	if p.channel != nil {
		_ = p.channel.Close()
	}

	if p.conn != nil {
		_ = p.conn.Close()
	}
}
