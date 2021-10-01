## Thu Sep 30 07:00:05 CDT 2021

Writing an application and I'm pretty certain that I do not want the map and
reduce built into it, that this should be external.

Okay, now it is external. You used to build it in, so that you had a `map` and
`reduce` function in your controller. Now to do map/reduce you use Conference.

The controller functions are blocking and I'd like to keep it that way, but
often times we want to perform an asychronous action then indicate we are done
while allowing other messages to be processed. When you want this you start
creating additional queues to queue up actions and that's complicated. We
already have asynchronous queues with the network requests.

## Thu Jul 29 12:55:15 CDT 2021

I don't believe there is a lot to gain by making this more functional. There may
be some use in having a countdown utility, which could easily be provided as an
additional class in the package. Otherwise, adding asynchronous functions only
appears to make the implementations more complicated as I need to start new
strands/fibers/green threads, I need to get more concurrent. When I'm
implementing something using this library I'm already thinking in terms of the
messaging and it is already complicated enough. This library will never be one
where the difference between complex and elegant is a matter of streamlining the
message passing through sequential statements. Let's through the words async and
await in this comment in case I ever want to search them for notes. In fact, I
believe I'm going to copy this into a `diary.md` so I can find it in the source.

## Sat Oct 19 13:35:38 CDT 2019

Should Islander unwrap the message so it isn't inside `body.body`? I want to
reduce the noise inside Compassion Conference where I need to double wrap a
cached message in order to replay it. Perhaps I keep the entire message in the
backlog? But then I'm doing `entry.body.body` in other parts of the log.

Feel like this might be the right thing to do.

## Sun Oct 13 20:57:44 CDT 2019

The user application is going to be an object. It is going to be constructed by
Compassion on the user's behalf. The first argument to the constructor is the
conference. When you build your application you pass the constructor function
and you receive as a return value the constructed application object. If you
want to expose the conference object, make it a public property of your
application object. Any arguments you want to pass to the constructor come after
the constructor property in the construction function and are received after the
`conference` argument to your application constructor.

The application object implements an interface. That interface is the `dispatch`
method and the `snapshot` method. They are separate because they are separate
network calls. `dispatch` only ever happens one at a time in a series, whereas
`snapshot` can come at any time, it is the out-of-band channel to transport the
initial state between nodes. One end is `join`. The other end is `snapshot`.

I tend to do things as functions and have the user bind or shim with an
anonymous function, but that is in lower level libraries like Avenue and
Destructible. At this level having the formalism of an object interface seems
more appropriate. Can't imagine how to do this with `EventEmitter`s because they
are not `async`. Rubbishing the inkling that this paragraph has given me that a
new event dispatch interface is needed.

I'm feeling good enough about `Destructible` that I'm willing to introduce it
end users, but I won't. I'll be using it myself in my applications, it is
already here with Compassion, so I can explain that it is an inversion of
control or some such, so that it isn't such a heavy lift to get it into the
heads of anyone who is adopting. Look, if you need to start some long running
process when your consensus application starts, you can start it in a
constructor using `Destructible`. However, if you really do have something you
need to `await` one time, like a configuration file read or startign a server,
then you can start it before you feed it to the application constructor as an
argument.

Your application is going to be a variable state machine, though. You won't be
able to really make use of it until it is ready. Checking the `ready` property
of the conference after construction is probably a good move before you start to
use your application. You can either expose the entire conference as a property
of your application or make the `ready` property of the conference a property of
your application.
